package handlers

import (
	"metrics/models"
	"metrics/storage"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func SpeedtestCreate(c *gin.Context) {
	var in models.Speedtest
	if err := c.ShouldBindJSON(&in); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	now := time.Now().UTC()
	in.ReceivedAt = &now

	if err := storage.SpeedtestInsert(c.Request.Context(), &in); err != nil {
		if we, ok := err.(mongo.WriteException); ok {
			for _, e := range we.WriteErrors {
				if e.Code == 11000 {
					c.AbortWithStatusJSON(http.StatusConflict, gin.H{"error": "duplicate_result_id"})
					return
				}
			}
		}
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "db_insert_failed"})
		return
	}

	c.JSON(http.StatusCreated, true)
}

func SpeedtestList(c *gin.Context) {
	fromStr := c.Query("from")
	toStr := c.Query("to")

	var (
		from *time.Time
		to   *time.Time
		err  error
	)

	if fromStr != "" {
		ms, err := strconv.ParseInt(fromStr, 10, 64)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid_from"})
			return
		}
		t := time.UnixMilli(ms)
		from = &t
	}

	if toStr != "" {
		ms, err := strconv.ParseInt(toStr, 10, 64)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid_to"})
			return
		}
		t := time.UnixMilli(ms)
		to = &t
	}

	items, err := storage.SpeedtestQuery(c.Request.Context(), from, to)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "db_query_failed"})
		return
	}

	c.JSON(http.StatusOK, items)
}

type trendingResponse struct {
	Total struct {
		Sum      int64 `json:"sum"`
		Trending int64 `json:"trending"`
	} `json:"total"`
	Download struct {
		Avg  int `json:"avg"`
		Last int `json:"last"`
	} `json:"download"`
	Upload struct {
		Avg  int `json:"avg"`
		Last int `json:"last"`
	} `json:"upload"`
	Ping struct {
		Avg  int `json:"avg"`
		Last int `json:"last"`
	} `json:"ping"`
}

func SpeedtestTrending(c *gin.Context) {
	ctx := c.Request.Context()
	now := time.Now().UTC()
	from24h := now.Add(-24 * time.Hour)
	from7d := now.Add(-7 * 24 * time.Hour)

	totalSum, err := storage.SpeedtestCount(ctx, nil, nil)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "db_count_failed"})
		return
	}

	trendingCount, err := storage.SpeedtestCount(ctx, &from24h, &now)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "db_count_24h_failed"})
		return
	}

	weekItems, err := storage.SpeedtestQuery(ctx, &from7d, &now)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "db_query_week_failed"})
		return
	}

	var (
		sumDown int
		sumUp   int
		sumPing int
		n       int
	)
	for i := range weekItems {
		sumDown += int(weekItems[i].Download.Bandwidth)
		sumUp += int(weekItems[i].Upload.Bandwidth)
		sumPing += int(weekItems[i].Ping.Latency)
		n++
	}

	var avgDown, avgUp, avgPing int
	if n > 0 {
		avgDown = sumDown / n
		avgUp = sumUp / n
		avgPing = sumPing / n
	}

	var lastDown, lastUp, lastPing int
	latest, err := storage.SpeedtestQueryLatest(ctx, &from24h, &now)
	if err == nil && latest != nil {
		lastDown = latest.Download.Bandwidth
		lastUp = latest.Upload.Bandwidth
		lastPing = int(latest.Ping.Latency)
	} else if err != nil && err != mongo.ErrNoDocuments {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "db_query_latest_failed"})
		return
	}

	var out trendingResponse
	out.Total.Sum = totalSum
	out.Total.Trending = trendingCount
	out.Download.Avg = avgDown
	out.Download.Last = lastDown
	out.Upload.Avg = avgUp
	out.Upload.Last = lastUp
	out.Ping.Avg = avgPing
	out.Ping.Last = lastPing

	c.JSON(http.StatusOK, out)
}

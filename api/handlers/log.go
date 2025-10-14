package handlers

import (
	"errors"
	"io"
	"metrics/models"
	"metrics/storage"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func LogCreate(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil || len(body) == 0 {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "empty_body"})
		return
	}

	batch, err := models.LogsFromJSON(body)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := storage.LogInsert(c.Request.Context(), batch); err != nil {
		var bwe mongo.BulkWriteException
		var we mongo.WriteException
		if errors.As(err, &bwe) || errors.As(err, &we) {
			c.AbortWithStatusJSON(http.StatusConflict, gin.H{"error": "duplicate_req_id"})
			return
		}
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "db_insert_failed"})
		return
	}

	c.JSON(http.StatusCreated, true)
}

func LogList(c *gin.Context) {
	from, to, ok := validateAndNormalizeRange(c)
	if !ok {
		return
	}

	items, err := storage.LogQuery(c.Request.Context(), from, to)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "db_query_failed"})
		return
	}

	c.JSON(http.StatusOK, items)
}

func LogStats(c *gin.Context) {
	fromT, toT, ok := validateAndNormalizeRange(c)
	if !ok {
		return
	}

	last, err := storage.LogLatest(c.Request.Context(), fromT, toT)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "db_last_failed"})
		return
	}
	if last == nil {
		c.JSON(http.StatusOK, []models.LogChartPoint{})
		return
	}

	effectiveTo := *last

	points, err := storage.LogStats(c.Request.Context(), *fromT, effectiveTo)

	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "db_aggregate_failed"})
		return
	}

	c.JSON(http.StatusOK, points)
}

type LogCountResponse struct {
	All struct {
		Total int64 `json:"total"`
		Last  int64 `json:"last"`
	} `json:"all"`
	Errors struct {
		Total int64 `json:"total"`
		Last  int64 `json:"last"`
	} `json:"errors"`
}

func LogCount(c *gin.Context) {
	from, to, ok := validateAndNormalizeRange(c)
	if !ok {
		return
	}

	now := time.Now().UTC()
	lastFrom := now.Add(-24 * time.Hour)
	lastTo := now

	totalAll, err := storage.LogCount(c.Request.Context(), from, to)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "db_count_failed"})
		return
	}

	lastAll, err := storage.LogCount(c.Request.Context(), &lastFrom, &lastTo)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "db_count_failed"})
		return
	}

	totalErrors, err := storage.LogCountErrors(c.Request.Context(), from, to)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "db_count_failed"})
		return
	}

	lastErrors, err := storage.LogCountErrors(c.Request.Context(), &lastFrom, &lastTo)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "db_count_failed"})
		return
	}

	var resp LogCountResponse
	resp.All.Total = totalAll
	resp.All.Last = lastAll
	resp.Errors.Total = totalErrors
	resp.Errors.Last = lastErrors

	c.JSON(http.StatusOK, resp)
}

// ---------------- Private helpers ----------------

func validateAndNormalizeRange(c *gin.Context) (*time.Time, *time.Time, bool) {
	const maxRange = 90 * 24 * time.Hour

	fromStr := c.Query("from")
	toStr := c.Query("to")

	var (
		from *time.Time
		to   *time.Time
	)

	if fromStr != "" {
		ms, err := strconv.ParseInt(fromStr, 10, 64)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid_from"})
			return nil, nil, false
		}
		ft := time.UnixMilli(ms).UTC()
		from = &ft
	}

	if toStr != "" {
		ms, err := strconv.ParseInt(toStr, 10, 64)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid_to"})
			return nil, nil, false
		}
		tt := time.UnixMilli(ms).UTC()
		to = &tt
	}

	now := time.Now().UTC()

	if to == nil {
		t := now
		to = &t
	}
	if from == nil {
		f := to.Add(-maxRange)
		from = &f
	}

	if to.Before(*from) {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid_range"})
		return nil, nil, false
	}

	if to.Sub(*from) > maxRange {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "range_too_large"})
		return nil, nil, false
	}

	return from, to, true
}

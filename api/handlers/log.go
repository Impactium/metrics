package handlers

import (
	"errors"
	"fmt"
	"io"
	"metrics/models"
	"metrics/storage"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

const NINETY_DAYS_MS int64 = 90 * 24 * int64(time.Hour/time.Millisecond)
const TWENTY_FOUR_HOURS_MS int64 = 24 * int64(time.Hour/time.Millisecond)

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
		fmt.Println(err)
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

	nowMs := time.Now().UnixMilli()
	lastFrom := nowMs - TWENTY_FOUR_HOURS_MS
	lastTo := nowMs

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

func validateAndNormalizeRange(c *gin.Context) (*int64, *int64, bool) {
	fromStr := c.Query("from")
	toStr := c.Query("to")

	var (
		from *int64
		to   *int64
	)

	if fromStr != "" {
		ms, err := strconv.ParseInt(fromStr, 10, 64)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid_from"})
			return nil, nil, false
		}
		from = &ms
	}

	if toStr != "" {
		ms, err := strconv.ParseInt(toStr, 10, 64)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid_to"})
			return nil, nil, false
		}
		to = &ms
	}

	nowMs := time.Now().UnixMilli()

	if to == nil {
		t := nowMs
		to = &t
	}
	if from == nil {
		f := *to - NINETY_DAYS_MS
		from = &f
	}

	if *to < *from {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid_range"})
		return nil, nil, false
	}

	if (*to - *from) > NINETY_DAYS_MS {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "range_too_large"})
		return nil, nil, false
	}

	return from, to, true
}

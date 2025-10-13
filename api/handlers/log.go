package handlers

import (
	"errors"
	"io"
	"metrics/models"
	"metrics/storage"
	"net/http"
	"strconv"

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
			return
		}
		from = &ms
	}

	if toStr != "" {
		ms, err := strconv.ParseInt(toStr, 10, 64)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid_to"})
			return
		}
		to = &ms
	}

	items, err := storage.LogQuery(c.Request.Context(), from, to)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "db_query_failed"})
		return
	}

	c.JSON(http.StatusOK, items)
}

func LogCount(c *gin.Context) {
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
			return
		}
		from = &ms
	}

	if toStr != "" {
		ms, err := strconv.ParseInt(toStr, 10, 64)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid_to"})
			return
		}
		to = &ms
	}

	count, err := storage.LogCount(c.Request.Context(), from, to)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "db_count_failed"})
		return
	}

	c.JSON(http.StatusOK, count)
}

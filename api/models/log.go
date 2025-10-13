package models

import (
	"encoding/json"
	"errors"
	"strconv"

	"github.com/gin-gonic/gin"
)

type Log struct {
	ReqID     string          `json:"req_id" gorm:"primaryKey;size:64"`
	Timestamp int64           `json:"timestamp" validate:"required"`
	Status    int             `json:"status" validate:"required"`
	Took      int             `json:"took"`
	Path      string          `json:"path" validate:"required"`
	Method    string          `json:"method" validate:"required"`
	Data      json.RawMessage `json:"data" gorm:"type:jsonb"`
}

func (Log) TableName() string { return "logs" }

func (l *Log) Validate() error {
	if l.Timestamp == 0 {
		return errors.New("timestamp_required")
	}
	if l.Status == 0 {
		return errors.New("status_required")
	}
	if l.Path == "" {
		return errors.New("path_required")
	}
	if l.Method == "" {
		return errors.New("method_required")
	}
	return nil
}

func LogsFromJSON(b []byte) ([]Log, error) {
	var batch []Log
	if err := json.Unmarshal(b, &batch); err == nil {
		if len(batch) == 0 {
			return nil, errors.New("empty_array")
		}
		for i := range batch {
			if err := batch[i].Validate(); err != nil {
				return nil, err
			}
		}
		return batch, nil
	}
	var one Log
	if err := json.Unmarshal(b, &one); err != nil {
		return nil, errors.New("invalid_json")
	}
	if err := one.Validate(); err != nil {
		return nil, err
	}
	return []Log{one}, nil
}

type LogSelectOptions struct {
	Skip  int
	Limit int
}

func (o *LogSelectOptions) FromContext(c *gin.Context) error {
	if v := c.DefaultQuery("skip", "0"); v != "" {
		if i, err := strconv.Atoi(v); err == nil && i >= 0 {
			o.Skip = i
		}
	}
	if v := c.DefaultQuery("limit", "50"); v != "" {
		if i, err := strconv.Atoi(v); err == nil && i > 0 && i <= 1000 {
			o.Limit = i
		} else if err == nil && i > 1000 {
			o.Limit = 1000
		}
	}
	if o.Limit == 0 {
		o.Limit = 50
	}
	return nil
}

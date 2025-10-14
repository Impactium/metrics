package models

import (
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Log struct {
	ReqID     string                 `json:"req_id" bson:"req_id"`
	Timestamp time.Time              `json:"timestamp" bson:"timestamp" validate:"required"`
	Status    int                    `json:"status" bson:"status" validate:"required"`
	Took      int                    `json:"took" bson:"took"`
	Path      string                 `json:"path" bson:"path" validate:"required"`
	Method    string                 `json:"method" bson:"method" validate:"required"`
	Data      map[string]interface{} `json:"data,omitempty" bson:"data,omitempty"`
}

type StatusRecord struct {
	Success    int64 `json:"success" bson:"success"`
	Redirect   int64 `json:"redirect" bson:"redirect"`
	BadRequest int64 `json:"badRequest" bson:"badRequest"`
	Error      int64 `json:"error" bson:"error"`
}

type LogChartPoint struct {
	Date int64 `json:"date" bson:"date"`
	StatusRecord
}

func (l *Log) Validate() error {
	if l.Timestamp.IsZero() {
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

func (l *Log) UnmarshalJSON(b []byte) error {
	type Alias Log
	aux := struct {
		Timestamp any `json:"timestamp"`
		*Alias
	}{
		Alias: (*Alias)(l),
	}
	if err := json.Unmarshal(b, &aux); err != nil {
		return err
	}
	switch v := aux.Timestamp.(type) {
	case nil:
	case float64:
		l.Timestamp = fromUnixGuess(int64(v))
	case string:
		if t, err := time.Parse(time.RFC3339Nano, v); err == nil {
			l.Timestamp = t
		} else if t2, err2 := strconv.ParseInt(v, 10, 64); err2 == nil {
			l.Timestamp = fromUnixGuess(t2)
		} else {
			return errors.New("invalid_timestamp")
		}
	default:
		return errors.New("invalid_timestamp_type")
	}
	return nil
}

func fromUnixGuess(x int64) time.Time {
	switch {
	case x > 1_000_000_000_000:
		return time.Unix(0, x*int64(time.Millisecond)).UTC()
	case x >= 1_000_000_000:
		return time.Unix(x, 0).UTC()
	default:
		return time.Unix(0, x*int64(time.Millisecond)).UTC()
	}
}

func (l *Log) EnsureReqID() {
	if strings.TrimSpace(l.ReqID) == "" {
		l.ReqID = uuid.NewString()
	}
}

func LogsFromJSON(b []byte) ([]Log, error) {
	var batch []Log
	if err := json.Unmarshal(b, &batch); err == nil {
		if len(batch) == 0 {
			return nil, errors.New("empty_array")
		}
		for i := range batch {
			batch[i].EnsureReqID()
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

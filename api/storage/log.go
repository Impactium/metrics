package storage

import (
	"context"
	"metrics/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func LogInsert(ctx context.Context, payload []models.Log) error {
	if len(payload) == 1 {
		_, err := logs.InsertOne(ctx, payload[0])
		return err
	}
	docs := make([]interface{}, len(payload))
	for i := range payload {
		docs[i] = payload[i]
	}
	_, err := logs.InsertMany(ctx, docs)
	return err
}

func LogQuery(ctx context.Context, from, to *time.Time, limit, skip int64) ([]models.Log, error) {
	filter := bson.D{}
	if from != nil || to != nil {
		r := bson.D{}
		if from != nil {
			r = append(r, bson.E{Key: "$gte", Value: *from})
		}
		if to != nil {
			r = append(r, bson.E{Key: "$lte", Value: *to})
		}
		filter = append(filter, bson.E{Key: "timestamp", Value: r})
	}

	findOpts := options.Find().SetSort(bson.D{{Key: "timestamp", Value: -1}})
	if skip > 0 {
		findOpts.SetSkip(skip)
	}
	if limit >= 0 { // -1 = без лимита
		findOpts.SetLimit(limit)
	}

	cur, err := logs.Find(ctx, filter, findOpts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	out := make([]models.Log, 0)
	for cur.Next(ctx) {
		var s models.Log
		if err := cur.Decode(&s); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, cur.Err()
}

func LogLatest(ctx context.Context, from, to *time.Time, limit, skip int64) (*time.Time, error) {
	match := bson.D{}
	if from != nil || to != nil {
		ts := bson.D{}
		if from != nil {
			ts = append(ts, bson.E{Key: "$gte", Value: *from})
		}
		if to != nil {
			ts = append(ts, bson.E{Key: "$lte", Value: *to})
		}
		match = append(match, bson.E{Key: "timestamp", Value: ts})
	}

	opts := options.Find().SetSort(bson.D{{Key: "timestamp", Value: -1}}).SetLimit(1)
	if skip > 0 {
		opts.SetSkip(skip)
	}

	cur, err := logs.Find(ctx, match, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	if !cur.Next(ctx) {
		return nil, cur.Err()
	}
	var doc struct {
		Timestamp time.Time `bson:"timestamp"`
	}
	if err := cur.Decode(&doc); err != nil {
		return nil, err
	}
	return &doc.Timestamp, nil
}

func LogStats(ctx context.Context, from, to time.Time) ([]models.LogChartPoint, error) {
	from = from.UTC()
	to = to.UTC()

	match := bson.D{
		{Key: "timestamp", Value: bson.D{
			{Key: "$gte", Value: from},
			{Key: "$lte", Value: to},
		}},
	}

	truncUnit := "hour"

	pipeline := mongo.Pipeline{
		bson.D{{Key: "$match", Value: match}},
		bson.D{{Key: "$addFields", Value: bson.D{
			{Key: "statusN", Value: bson.D{{Key: "$convert", Value: bson.D{
				{Key: "input", Value: "$status"},
				{Key: "to", Value: "int"},
				{Key: "onError", Value: 0},
				{Key: "onNull", Value: 0},
			}}}}},
		}},
		bson.D{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: bson.D{
				{Key: "date", Value: bson.D{
					{Key: "$dateTrunc", Value: bson.D{
						{Key: "date", Value: "$timestamp"},
						{Key: "unit", Value: truncUnit},
						{Key: "timezone", Value: "UTC"},
					}},
				}},
			}},
			{Key: "success", Value: bson.D{{Key: "$sum", Value: bson.D{
				{Key: "$cond", Value: bson.A{
					bson.D{{Key: "$and", Value: bson.A{
						bson.D{{Key: "$gte", Value: bson.A{"$statusN", 200}}},
						bson.D{{Key: "$lte", Value: bson.A{"$statusN", 299}}},
					}}},
					1, 0,
				}},
			}}}},
			{Key: "redirect", Value: bson.D{{Key: "$sum", Value: bson.D{
				{Key: "$cond", Value: bson.A{
					bson.D{{Key: "$and", Value: bson.A{
						bson.D{{Key: "$gte", Value: bson.A{"$statusN", 300}}},
						bson.D{{Key: "$lte", Value: bson.A{"$statusN", 399}}},
					}}},
					1, 0,
				}},
			}}}},
			{Key: "badRequest", Value: bson.D{{Key: "$sum", Value: bson.D{
				{Key: "$cond", Value: bson.A{
					bson.D{{Key: "$and", Value: bson.A{
						bson.D{{Key: "$gte", Value: bson.A{"$statusN", 400}}},
						bson.D{{Key: "$lte", Value: bson.A{"$statusN", 499}}},
					}}},
					1, 0,
				}},
			}}}},
			{Key: "error", Value: bson.D{{Key: "$sum", Value: bson.D{
				{Key: "$cond", Value: bson.A{
					bson.D{{Key: "$and", Value: bson.A{
						bson.D{{Key: "$gte", Value: bson.A{"$statusN", 500}}},
						bson.D{{Key: "$lte", Value: bson.A{"$statusN", 599}}},
					}}},
					1, 0,
				}},
			}}}},
		}}},
		bson.D{{Key: "$sort", Value: bson.D{{Key: "_id.date", Value: 1}}}},
	}

	cur, err := logs.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	var results []models.LogChartPoint
	for cur.Next(ctx) {
		var agg struct {
			ID struct {
				Date time.Time `bson:"date"`
			} `bson:"_id"`
			Success    int64 `bson:"success"`
			Redirect   int64 `bson:"redirect"`
			BadRequest int64 `bson:"badRequest"`
			Error      int64 `bson:"error"`
		}
		if err := cur.Decode(&agg); err != nil {
			return nil, err
		}
		results = append(results, models.LogChartPoint{
			Date: agg.ID.Date.UnixMilli(),
			StatusRecord: models.StatusRecord{
				Success:    agg.Success,
				Redirect:   agg.Redirect,
				BadRequest: agg.BadRequest,
				Error:      agg.Error,
			},
		})
	}

	if err := cur.Err(); err != nil {
		return nil, err
	}

	if len(results) == 0 {
		return []models.LogChartPoint{}, nil
	}

	return results, nil
}

func LogCount(ctx context.Context, from, to *time.Time, limit, skip int64) (int64, error) {
	filter := bson.D{}
	if from != nil || to != nil {
		r := bson.D{}
		if from != nil {
			r = append(r, bson.E{Key: "$gte", Value: *from})
		}
		if to != nil {
			r = append(r, bson.E{Key: "$lte", Value: *to})
		}
		filter = append(filter, bson.E{Key: "timestamp", Value: r})
	}

	countOpts := options.Count()
	if skip > 0 {
		countOpts.SetSkip(skip)
	}
	if limit >= 0 {
		countOpts.SetLimit(limit)
	}

	return logs.CountDocuments(ctx, filter, countOpts)
}

func LogCountErrors(ctx context.Context, from, to *time.Time) (int64, error) {
	filter := bson.D{
		{Key: "status", Value: bson.D{{Key: "$gte", Value: 500}}},
	}
	if from != nil || to != nil {
		r := bson.D{}
		if from != nil {
			r = append(r, bson.E{Key: "$gte", Value: *from})
		}
		if to != nil {
			r = append(r, bson.E{Key: "$lte", Value: *to})
		}
		filter = append(filter, bson.E{Key: "timestamp", Value: r})
	}
	return logs.CountDocuments(ctx, filter)
}

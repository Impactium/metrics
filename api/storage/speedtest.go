package storage

import (
	"context"
	"metrics/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func SpeedtestInsert(ctx context.Context, st *models.Speedtest) error {
	_, err := speedtests.InsertOne(ctx, st)
	return err
}

func SpeedtestQuery(ctx context.Context, from, to *time.Time) ([]models.Speedtest, error) {
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

	cur, err := speedtests.Find(ctx, filter, optionsFind())
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	var out []models.Speedtest
	for cur.Next(ctx) {
		var s models.Speedtest
		if err := cur.Decode(&s); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, cur.Err()
}

func SpeedtestCount(ctx context.Context, from, to *time.Time) (int64, error) {
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
	return speedtests.CountDocuments(ctx, filter)
}

func SpeedtestQueryLatest(ctx context.Context, from, to *time.Time) (*models.Speedtest, error) {
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

	opts := options.FindOne().SetSort(bson.D{{Key: "timestamp", Value: -1}})
	var out models.Speedtest
	err := speedtests.FindOne(ctx, filter, opts).Decode(&out)
	if err != nil {
		return nil, err
	}
	return &out, nil
}

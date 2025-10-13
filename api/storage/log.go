package storage

import (
	"context"
	"metrics/models"

	"go.mongodb.org/mongo-driver/bson"
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

func LogQuery(ctx context.Context, from, to *int64) ([]models.Log, error) {
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

	findOpts := optionsFind()
	// сортировка по убыванию времени, как обычно для логов
	findOpts.SetSort(bson.D{{Key: "timestamp", Value: -1}})

	cur, err := logs.Find(ctx, filter, findOpts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	var out []models.Log
	for cur.Next(ctx) {
		var s models.Log
		if err := cur.Decode(&s); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, cur.Err()
}

func LogCount(ctx context.Context, from, to *int64) (int64, error) {
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
	return logs.CountDocuments(ctx, filter)
}

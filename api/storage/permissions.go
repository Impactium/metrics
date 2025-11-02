package storage

import (
	"context"
	"metrics/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func PermissionsGetByUserId(ctx context.Context, id primitive.ObjectID) (*models.Permissions, error) {
	var p models.Permissions

	filter := bson.M{"_id": id}
	update := bson.M{
		"$setOnInsert": bson.M{
			"_id":     id,
			"allowed": bson.A{},
			"denied":  bson.A{},
		},
	}

	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)

	err := permissions.FindOneAndUpdate(ctx, filter, update, opts).Decode(&p)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

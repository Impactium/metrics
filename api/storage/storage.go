package storage

import (
	"context"
	"os"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	client   *mongo.Client
	db       *mongo.Database
	col      *mongo.Collection
	usersCol *mongo.Collection
)

func Connect(ctx context.Context) error {
	uri := os.Getenv("MONGO_URI")
	if uri == "" {
		uri = "mongodb://localhost:27017"
	}
	name := os.Getenv("MONGO_DB")
	if name == "" {
		name = "metrics"
	}
	c, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return err
	}
	client = c
	db = client.Database(name)
	col = db.Collection("speedtests")
	usersCol = db.Collection("users")
	return nil
}

func Disconnect(ctx context.Context) {
	if client != nil {
		_ = client.Disconnect(ctx)
	}
}

func EnsureIndexes(ctx context.Context) error {
	// speedtests
	_, err := col.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "timestamp", Value: 1}}},
		{Keys: bson.D{{Key: "result.id", Value: 1}}, Options: options.Index().SetUnique(true)},
	})
	if err != nil {
		return err
	}
	// users
	_, err = usersCol.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "email", Value: 1}}, Options: options.Index().SetUnique(true)},
	})
	return err
}

func optionsFind() *options.FindOptions {
	o := options.Find()
	o.SetSort(bson.D{{Key: "timestamp", Value: -1}})
	o.SetLimit(1000)
	return o
}

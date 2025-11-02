package storage

import (
	"context"
	"os"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	client      *mongo.Client
	db          *mongo.Database
	permissions *mongo.Collection
	speedtests  *mongo.Collection
	users       *mongo.Collection
	logs        *mongo.Collection
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
	permissions = db.Collection("permissions")
	speedtests = db.Collection("speedtests")
	users = db.Collection("users")
	logs = db.Collection("logs")
	return nil
}

func Disconnect(ctx context.Context) {
	if client != nil {
		_ = client.Disconnect(ctx)
	}
}

func EnsureIndexes(ctx context.Context) error {
	// speedtests
	_, err := speedtests.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "timestamp", Value: 1}}},
		{Keys: bson.D{{Key: "result.id", Value: 1}}, Options: options.Index().SetUnique(true)},
	})

	if err != nil {
		return err
	}

	// users
	_, err = users.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "email", Value: 1}}, Options: options.Index().SetUnique(true)},
	})

	if err != nil {
		return err
	}

	// logs
	_, err = logs.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "req_id", Value: 1}}, Options: options.Index().SetUnique(true)},
		{Keys: bson.D{{Key: "status", Value: 1}}, Options: options.Index()},
		{Keys: bson.D{{Key: "timestamp", Value: 1}}, Options: options.Index()},
		{Keys: bson.D{{Key: "timestamp", Value: 1}, {Key: "status", Value: 1}}, Options: options.Index()},
	})

	return err
}

func optionsFind() *options.FindOptions {
	o := options.Find()
	o.SetSort(bson.D{{Key: "timestamp", Value: -1}})
	o.SetLimit(1000)
	return o
}

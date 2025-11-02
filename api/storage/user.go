package storage

import (
	"context"
	"metrics/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func UserCreate(ctx context.Context, u *models.User) error {
	_, err := users.InsertOne(ctx, u)
	return err
}

func UserGetByEmail(ctx context.Context, email string) (*models.User, error) {
	var u models.User
	err := users.FindOne(ctx, bson.M{"email": email}).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func UserGetByID(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
	var u models.User
	err := users.FindOne(ctx, bson.M{"_id": id}).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

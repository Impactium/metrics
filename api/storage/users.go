package storage

import (
	"context"
	"metrics/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func CreateUser(ctx context.Context, u *models.User) error {
	_, err := usersCol.InsertOne(ctx, u)
	return err
}

func GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var u models.User
	err := usersCol.FindOne(ctx, bson.M{"email": email}).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func GetUserByID(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
	var u models.User
	err := usersCol.FindOne(ctx, bson.M{"_id": id}).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

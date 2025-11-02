package models

import "go.mongodb.org/mongo-driver/bson/primitive"

type Permissions struct {
	ID      primitive.ObjectID `bson:"_id,omitempty" json:"-"`
	Allowed []string           `bson:"allowed,omitempty" json:"allowed" binding:"required,dive,required"`
	Denied  []string           `bson:"denied,omitempty"  json:"denied"  binding:"required,dive,required"`
}

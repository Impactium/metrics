package handlers

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"metrics/constraints"
	"metrics/middlewares"
	"metrics/models"
	"metrics/storage"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

var validate = validator.New()

type registerDTO struct {
	Email           string `json:"email" validate:"required,email"`
	Password        string `json:"password" validate:"required,min=8,max=128"`
	ConfirmPassword string `json:"confirmPassword" validate:"required,eqfield=Password"`
}

type loginDTO struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
	Remember *bool  `json:"remember,omitempty"`
}

func Register(c *gin.Context) {
	var payload registerDTO
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}
	if err := validate.Struct(payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "validation failed"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	if existing, err := storage.GetUserByEmail(ctx, strings.ToLower(payload.Email)); err == nil && existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "email already registered"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(payload.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "hashing error"})
		return
	}

	u := &models.User{
		Email:        strings.ToLower(payload.Email),
		PasswordHash: string(hash),
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := storage.CreateUser(ctx, u); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": u.ID.Hex(), "email": u.Email})
}

func Login(c *gin.Context) {
	var payload loginDTO
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}
	if err := validate.Struct(payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "validation failed"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	u, err := storage.GetUserByEmail(ctx, strings.ToLower(payload.Email))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(payload.Password)) != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	remember := false
	if payload.Remember != nil {
		remember = *payload.Remember
	}
	ttl := 24 * time.Hour
	if remember {
		ttl = 7 * 24 * time.Hour
	}
	token, err := middlewares.SignJWT(u.ID.Hex(), u.Email, ttl)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token error"})
		return
	}

	c.SetCookie(constraints.Authorization, token, int(ttl.Seconds()), "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{"id": u.ID.Hex(), "email": u.Email})
}

func Profile(c *gin.Context) {
	user, _ := c.Get("user")

	c.JSON(http.StatusOK, user)
}

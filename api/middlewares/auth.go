package middlewares

import (
	"metrics/constraints"
	"metrics/models"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type tokenUser struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

type Claims struct {
	tokenUser
	jwt.RegisteredClaims
}

func SignJWT(ID, Email string, ttl time.Duration) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = constraints.DevSecret
	}
	now := time.Now()
	claims := &Claims{
		tokenUser: tokenUser{ID, Email},
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString([]byte(secret))
}

func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.GetHeader(constraints.Authorization)
		if cookie, err := c.Request.Cookie(constraints.Authorization); err == nil && token == "" {
			token = cookie.Value
		}
		if token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "no token"})
			return
		}

		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			secret = constraints.DevSecret
		}
		res, err := jwt.ParseWithClaims(token, &Claims{}, func(t *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})
		if err != nil || !res.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		claims, ok := res.Claims.(*Claims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid claims"})
			return
		}

		oid, err := primitive.ObjectIDFromHex(claims.tokenUser.ID)
		if err != nil || oid.IsZero() {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid user id"})
			return
		}

		c.Set("user", models.User{
			ID:    oid,
			Email: claims.Email,
		})
		c.Next()
	}
}

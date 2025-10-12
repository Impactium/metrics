package middlewares

import (
	"metrics/constraints"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type User struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

type Claims struct {
	User
	jwt.RegisteredClaims
}

func SignJWT(ID, Email string, ttl time.Duration) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = constraints.DevSecret
	}
	now := time.Now()
	claims := &Claims{
		User: User{ID, Email},
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
		if cookie, err := c.Request.Cookie(constraints.Authorization); err == nil {
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
		result, err := jwt.ParseWithClaims(token, &Claims{}, func(t *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})
		if err != nil || !result.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		claims := result.Claims.(*Claims)
		c.Set("user", User{
			ID:    claims.User.ID,
			Email: claims.User.Email,
		})
		c.Next()
	}
}

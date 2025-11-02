package middlewares

import (
	"net/http"
	"strings"

	"metrics/models"
	"metrics/storage"

	"github.com/gin-gonic/gin"
)

func PermissionsRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		u, ok := c.Get("user")
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, nil)
			return
		}
		user, ok := u.(models.User)
		if !ok || user.ID.IsZero() {
			c.AbortWithStatusJSON(http.StatusUnauthorized, nil)
			return
		}

		perms, err := storage.PermissionsGetByUserId(c, user.ID)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, nil)
			return
		}

		module, action := splitAPIPath(c.Request.URL.Path)
		if module == "" {
			c.AbortWithStatusJSON(http.StatusForbidden, nil)
			return
		}

		if !has(perms.Allowed, module) {
			c.AbortWithStatusJSON(http.StatusForbidden, nil)
			return
		}
		if action != "" && has(perms.Denied, module+"/"+action) {
			c.AbortWithStatusJSON(http.StatusForbidden, nil)
			return
		}

		c.Next()
	}
}

func splitAPIPath(p string) (module, action string) {
	parts := strings.Split(p, "/")
	out := make([]string, 0, len(parts))
	for _, s := range parts {
		if s != "" {
			out = append(out, s)
		}
	}

	module = out[1]
	if len(out) >= 3 {
		action = out[2]
	}
	return
}

func has(list []string, v string) bool {
	for _, s := range list {
		if s == v {
			return true
		}
	}
	return false
}

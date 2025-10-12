FROM golang:1.25.2 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /api .

FROM scratch
COPY --from=build /api /api
EXPOSE 1337
USER 65532:65532
ENTRYPOINT ["/api"]

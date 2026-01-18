.DEFAULT_GOAL := build

.PHONY:fmt vet build

fmt:
	go fmt ./...

vet:
	go vet ./...

build: fmt vet
	go build -o ./bin/fundfetti
	cd frontend && npm run build && cd ../


docker-build:
	docker build -t melvis02/fundfetti:latest .

docker-tag:
	docker tag melvis02/fundfetti:latest melvis02/fundfetti:latest

docker-login:
	docker login

docker-push: docker-login
	docker push melvis02/fundfetti:latest

docker-run:
	docker run -p 8080:8080 melvis02/fundfetti:latest
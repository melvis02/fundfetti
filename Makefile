.DEFAULT_GOAL := build

.PHONY:fmt vet build

fmt:
	go fmt ./...

vet:
	go vet ./...

build: fmt vet
	go build -o ./bin/flower-fundraiser-processing

docker-build:
	docker build -t melvis02/flower-fundraiser-processing:latest .

docker-tag:
	docker tag melvis02/flower-fundraiser-processing:latest melvis02/flower-fundraiser-processing:latest

docker-login:
	docker login

docker-push: docker-login
	docker push melvis02/flower-fundraiser-processing:latest

docker-run:
	docker run -p 8080:8080 melvis02/flower-fundraiser-processing:latest
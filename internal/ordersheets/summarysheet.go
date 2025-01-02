package ordersheets

import (
	"fmt"
	"os"
)

func GenerateSummarySheet(orders []Order) {

	html := []string{}

	css, err := os.ReadFile("../../assets/css/style.css")
	if err != nil {
		fmt.Println(err)
	}

	html = append(html, fmt.Sprintf("<html><head><style type='text/css'>%s</style></head><body>", css))
	html = append(html, "<table class='contactinfo'>")
	html = append(html, "<tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Sorted?</th><th>Delivered?</th></tr>")

	for _, order := range orders {
		html = append(html, fmt.Sprintf("<tr><td>%d</td><td>%s</td><td>%s</td><td>%s</td><td></td><td></td></tr>", order.OrderNumber, order.Name, order.Email, order.PhoneNumber))
	}
	html = append(html, "</table><br/>")

	html = append(html, "</body></html>")

	file, err := os.Create("FlowerFundraiserSummarySheet.html")
	if err != nil {
		panic(err)
	}
	defer file.Close() // Ensure the file is closed

	for _, line := range html {
		_, err = file.WriteString(line)
		if err != nil {
			panic(err)
		}
	}
}

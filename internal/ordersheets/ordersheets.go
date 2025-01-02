package ordersheets

import (
	"fmt"
	"os"
)

func GenerateOrderSheets(orders []Order) {

	html := []string{}

	css, err := os.ReadFile("assets/css/style.css")
	if err != nil {
		fmt.Println(err)
	}

	html = append(html, fmt.Sprintf("<html><head><style type='text/css'>%s</style></head>\n<body>\n", css))

	for _, order := range orders {

		html = append(html, "<table class='contactinfo'>\n")
		html = append(html, fmt.Sprintf("<tr><td>Order# %d</td><td>Customer: %s</td></tr>\n", order.OrderNumber, order.Name))
		html = append(html, fmt.Sprintf("<tr><td>Email: %s</td><td>Phone: %s</td></tr>\n", order.Email, order.PhoneNumber))
		html = append(html, "</table><br/>\n")

		html = append(html, "<table class='plants'>\n")
		html = append(html, "<tr><th>Plant</th><th>Quantity</th></tr>")
		for _, plant := range order.OrderedPlants {
			html = append(html, fmt.Sprintf("<tr><td>%s</td><td>%d</td></tr>\n", plant.PlantType, plant.Quantity))
		}
		html = append(html, "</table>\n<br/>\n")

		html = append(html, "<div class='pagebreak'> </div>\n")
	}

	html = append(html, "</body>\n</html>\n")

	file, err := os.Create("FlowerFundraiserOrderSheets.html")
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

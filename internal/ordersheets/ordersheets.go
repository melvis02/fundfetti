package ordersheets

import (
	"fmt"
	"html/template"
	"os"
)

func GenerateOrderSheets(orders []Order) {
	css, err := os.ReadFile("assets/css/style.css")
	if err != nil {
		fmt.Println(err)
		return
	}

	tmpl, err := template.New("orderSheet").Parse(`
		<html>
		<head>
			<style type='text/css'>{{.CSS}}</style>
		</head>
		<body>
			{{range .Orders}}
			<table class='contactinfo'>
				<tr><td>Order# {{.OrderNumber}}</td><td>Customer: {{.Name}}</td></tr>
				<tr><td>Email: {{.Email}}</td><td>Phone: {{.PhoneNumber}}</td></tr>
			</table>
			<br/>
			<table class='plants'>
				<tr><th>Plant</th><th>Quantity</th></tr>
				{{range .OrderedPlants}}
				<tr><td>{{.PlantType}}</td><td>{{.Quantity}}</td></tr>
				{{end}}
			</table>
			<div class='pagebreak'></div>
			{{end}}
		</body>
		</html>
	`)
	if err != nil {
		fmt.Println(err)
		return
	}

	data := struct {
		CSS    template.CSS
		Orders []Order
	}{
		CSS:    template.CSS(string(css)),
		Orders: orders,
	}

	file, err := os.Create("work/FlowerFundraiserOrderSheets.html")
	if err != nil {
		panic(err)
	}
	defer file.Close() // Ensure the file is closed

	err = tmpl.Execute(file, data)
	if err != nil {
		fmt.Println(err)
	}
}

package ordersheets

import (
	"fmt"
	"html/template"
	"os"
)

func GenerateSummarySheet(orders []Order) {
	css, err := os.ReadFile("assets/css/style.css")
	if err != nil {
		fmt.Println(err)
		return
	}

	tmpl, err := template.New("summarySheet").Parse(`
		<html>
		<head>
			<style type='text/css'>{{.CSS}}</style>
		</head>
		<body>
			<table class='contactinfo'>
				<tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Sorted?</th><th>Delivered?</th></tr>
				{{range .Orders}}
				<tr><td>{{.OrderNumber}}</td><td>{{.Name}}</td><td>{{.Email}}</td><td>{{.PhoneNumber}}</td><td></td><td></td></tr>
				{{end}}
			</table>
			
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

	file, err := os.Create("work/FlowerFundraiserSummarySheet.html")
	if err != nil {
		panic(err)
	}
	defer file.Close() // Ensure the file is closed

	err = tmpl.Execute(file, data)
	if err != nil {
		fmt.Println(err)
	}
}

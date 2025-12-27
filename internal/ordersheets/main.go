package ordersheets

import (
	"bytes"
	"encoding/csv"
	"io"
	"strconv"
	"strings"

	"github.com/agnivade/levenshtein"
)

type ColumnMap struct {
	ColumnIndex   int
	ColumnName    string
	IsOrderColumn bool
}

type OrderedPlant struct {
	PlantType string
	Quantity  int
}

type Order struct {
	OrderNumber   int
	CampaignID    *int64 // Nullable
	Name          string
	LastName      string
	Email         string
	PhoneNumber   string
	OrderedPlants []OrderedPlant
}

func ReadFile(file []byte, filename string) [][]string {
	records := [][]string{}

	reader := csv.NewReader(bytes.NewReader(file))
	if strings.HasSuffix(strings.ToLower(filename), ".tsv") {
		reader.Comma = '\t'
	} else if strings.HasSuffix(strings.ToLower(filename), ".csv") {
		reader.Comma = ','
	}

	for {
		record, err := reader.Read()
		if err != nil {
			if err == io.EOF {
				break
			}
		}
		records = append(records, record)
	}
	return records
}

func FormatOrderSheet(records [][]string) []Order {

	headers := records[0]

	// Standardize a few columns
	headers[findClosestMatchingColumnIndex("Name", headers)] = "Name"
	headers[findClosestMatchingColumnIndex("Email Address", headers)] = "Email Address"
	headers[findClosestMatchingColumnIndex("Phone Number", headers)] = "Phone Number"

	columnsMap := make(map[string]ColumnMap)
	for i, header := range headers {

		columnsMap[header] = ColumnMap{
			ColumnIndex:   i,
			ColumnName:    header,
			IsOrderColumn: strings.Contains(header, "$"),
		}
	}

	var orders []Order
	for i, record := range records[1:] {

		//Looks like we're hitting garbage time, bail out
		if record[0] == "" {
			break
		}

		order := Order{
			OrderNumber:   i + 1,
			Name:          record[columnsMap["Name"].ColumnIndex],
			LastName:      strings.Split(record[columnsMap["Name"].ColumnIndex], " ")[1],
			Email:         record[columnsMap["Email Address"].ColumnIndex],
			PhoneNumber:   record[columnsMap["Phone Number"].ColumnIndex],
			OrderedPlants: []OrderedPlant{},
		}

		for i, value := range record {
			if !columnsMap[headers[i]].IsOrderColumn {
				continue
			}
			quantity, err := strconv.Atoi(value)
			if err != nil {
				continue
			}
			if quantity <= 0 {
				continue
			}
			order.OrderedPlants = append(order.OrderedPlants, OrderedPlant{
				PlantType: headers[i],
				Quantity:  quantity,
			})
		}
		orders = append(orders, order)
	}
	return orders
}

func findClosestMatchingColumnIndex(target string, headers []string) int {
	minDistance := int(^uint(0) >> 1) // maximum int value
	closestMatch := 0
	for i, header := range headers {
		distance := levenshtein.ComputeDistance(target, header)
		if distance < minDistance {
			minDistance = distance
			closestMatch = i
		}
	}
	return closestMatch
}

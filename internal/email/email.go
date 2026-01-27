package email

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/melvis02/fundfetti/internal/db"
	"github.com/melvis02/fundfetti/internal/ordersheets"
	"github.com/resend/resend-go/v3"
)

func SendOrderConfirmation(order ordersheets.Order, campaign db.Campaign, org *db.Organization) error {
	apiKey := os.Getenv("RESEND_API_KEY")

	if apiKey == "" {
		log.Println("RESEND_API_KEY is missing. Skipping email.")
		return nil // Non-blocking failure
	}

	client := resend.NewClient(apiKey)

	subject := fmt.Sprintf("Order Confirmation - %s", campaign.Name)

	var itemsList strings.Builder
	var total float64
	for _, item := range order.OrderedPlants {
		// We need product price, but order item currently only has PlantType and Quantity.
		// Detailed price calculation should ideally be passed in or looked up.
		// For now, let's just list items.
		itemsList.WriteString(fmt.Sprintf("<li>%s x %d</li>", item.PlantType, item.Quantity))

		// Try to find price in campaign products if possible
		for _, p := range campaign.Products {
			if p.Name == item.PlantType {
				total += float64(p.PriceCents*item.Quantity) / 100.0
			}
		}
	}

	paymentInfo := campaign.PaymentMetadata
	if paymentInfo == "" && org != nil {
		paymentInfo = org.PaymentMetadata
	}
	if paymentInfo == "" {
		paymentInfo = "Please coordinate payment with the fundraiser organizer."
	}

	// Simple HTML template
	htmlBody := fmt.Sprintf(`
	<html>
	<body>
		<h2>Thank you for your order, %s!</h2>
		<p>You have successfully placed an order for <strong>%s</strong>.</p>
		
		<h3>Order Details:</h3>
		<ul>
			%s
		</ul>
		<p><strong>Total Estimate: $%.2f</strong></p>
		
		<h3>Payment Instructions:</h3>
		<div style="background-color: #f0fdf4; padding: 15px; border: 1px solid #bbf7d0; border-radius: 5px;">
			<p style="white-space: pre-wrap;">%s</p>
		</div>

		<p>If you have any questions, please reply to this email or contact us.</p>
	</body>
	</html>
	`, order.Name, campaign.Name, itemsList.String(), total, paymentInfo)

	// Determine sender email - try to use a verified domain if we knew it, or default
	// For Resend, user must verify domain. We'll use a standard one for now or env var.
	fromEmail := os.Getenv("FROM_EMAIL")
	if fromEmail == "" {
		fromEmail = "orders@fundfetti.com" // Placeholder, user likely needs to configure this
	}

	// Parse CC emails
	var ccEmails []string
	if campaign.OrderEmailCC != "" {
		parts := strings.Split(campaign.OrderEmailCC, ",")
		for _, part := range parts {
			trimmed := strings.TrimSpace(part)
			if trimmed != "" {
				ccEmails = append(ccEmails, trimmed)
			}
		}
	}

	params := &resend.SendEmailRequest{
		From:    fmt.Sprintf("%s <%s>", campaign.Name, fromEmail),
		To:      []string{order.Email},
		Cc:      ccEmails,
		Subject: subject,
		Html:    htmlBody,
	}

	sent, err := client.Emails.Send(params)
	if err != nil {
		return fmt.Errorf("failed to send email via Resend: %w", err)
	}

	log.Printf("Order confirmation email sent to %s (Resend ID: %s)", order.Email, sent.Id)
	return nil
}

# Fundraiser Order Processing

This is a web application for processing orders for non-profit fundraisers. It currently provides backend tracking for the fundraiser organizers of orders placed, paid for, and picked up. In future iterations, it will provide a frontend for customers to enter their orders and pay for them.

## Features

- Import orders from a CSV file
- Manage orders
- Print summaries and order sheets

## Workflows

### Current

#### Importing Orders

1. Upload a CSV file of order sheets
2. The CSV should have the following columns:
    - Order #
    - Name
    - Email
    - Phone
    - Items
3. The "Items" column should be a semicolon-separated list of items with the format "Quantity x Plant Type"

#### Managing Orders

1. View all orders in a table
2. Each order has the following columns:
    - Order #
    - Name
    - Email
    - Phone
    - Items
    - Picked Up
    - Paid
3. Update the status of each order
    - Picked Up
    - Paid

#### Printing Documents

1. Print a summary of all orders
2. Print an order sheet for each order

### TODO: Future Features

#### Product Management

1. View and manage products
2. Each product has the following properties:
    - Name
    - Price
    - (Optional) Description
    - (Optional) Image URL
    - (Optional) Stock/Quantity

### Campaign Management

1. View and manage campaigns
2. Each campaign has the following properties:
    - Name
    - Start Date
    - End Date
    - (Optional) Description
    - Products available for purchase
    - Payment Processing Options
    - Instructions for picking up orders

### Payment Processing Management

Administrators should be able to manage options for payment processing. This should include:
- Square
- Venmo
- Other payment processors

For starters, I think it probably makes sense to allow providing a URL  for each payment processor. Then each order can present QR codes and links in emails for users to follow to complete payment. Though we aren't directly managing the payment processing, there should be some way to connect a user's payment to an order.

#### Manual Order Entry

Customers should be able to enter their orders manually. The ordering process should be simple and straightforward. It should
- Be associated with a campaign
- Present a list of available products and allow the customer to select them
- Allow the customer to enter their contact information
- Allow the customer to review their order and confirm it

The following information should be collected in the second stage of the ordering process:
    - Name
    - Email
    - (Optional)Phone
    - Items

When a customer finishes entering an order, they should get an email summary of their order with information on next steps (payment and pickup).

#### Paymant

At this time, the application does not support direct payment processing. Instead, we'll allow the fundraiser organizers to provide links to pay via Square and Venmo. Each order should present QR codes and links in emails for users to follow to complete payment. Though we aren't directly managing the payment processing, there should be some way to connect a user's payment to an order.

## Tech Stack

- Go 1.22.2
- SQLite
- React
- Tailwind CSS
- Gorilla Web Toolkit

## TODO: Additional Features

- Migrate to an open source document database that is encrypted
- Add authentication and authorization
- Add a frontend for customers to enter their orders and pay for them
- Add encryption for stored data sensitive data (user emails, phone numbers, etc.)
- Provide inline user documentation, data privacy policies, etc.
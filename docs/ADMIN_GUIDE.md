# Administrator Guide

This guide explains how to use the Admin Dashboard to manage Organizations, Campaigns, Products, and Orders.

## Getting Started

1.  Access the Admin Dashboard by clicking the **Admin Login** link in the footer of the public homepage, or navigating directly to `/login`.
2.  After logging in, the main dashboard shows all **Orders** in the system, either imported or placed online.

## Managing Organizations

To support multiple fundraisers, the system uses **Organizations**.

1.  Click the **Orgs** button in the top navigation bar.
2.  **Create an Organization**: Enter the Name, Slug (URL friendly ID), and Contact Email.
3.  **Manage**: Click "Manage" on an existing organization to view its details.

## Managing Campaigns & Products

Once inside an Organization's dashboard (`/organizations/:id`):

### Products
1.  Click the **Products** tab.
2.  **Add Product**: Enter Name and Price.
3.  Products are created once and can be enabled/disabled or managed (stock) in future updates. Currently, they are available to all campaigns within the organization.

### Campaigns
1.  Click the **Campaigns** tab.
2.  **Launch New Campaign**: Enter Name, Start Date, End Date.
3.  The Campaign will be listed with its status.
4.  **Manage Products**: Click "Manage Products" on a campaign card to select which Organization Products are available for sale in this campaign.
5.  **Edit/Delete**: Click the Pencil icon to edit campaign details (including Active status) or the Trash icon to delete it.
6.  **Public Link**: The campaign is accessible to the public at `/c/{campaign_id}`.

## Order Management

On the main **Dashboard**:

-   **View Orders**: See a list of all orders.
-   **Status Updates**: Click the toggle buttons to mark orders as **Picked Up** or **Paid**.
-   **Print**: Use the top-right buttons to print "Order Summary" or "Order Sheets".
-   **Import**: You can still import CSV/TSV order sheets using the "Import Orders" box.

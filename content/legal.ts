export const legal = {
  privacy: {
    title: "Privacy",
    description: "How this website handles your information.",
    sections: [
      ["Your saved pieces", "Your bag and saved pieces are stored in your browser on this device. Clear this website’s browser data to remove them."],
      ["Forms and selection summaries", "Online enquiries, subscriptions and ordering are currently unavailable. Form details are checked in your browser and are not transmitted or saved by the application. A selection summary stores only a reference, quantities and totals for the current browser session."],
      ["Cookies and analytics", "This website sets no cookies and includes no analytics or third-party tracking scripts. The hosting provider may keep standard connection logs."],
    ],
  },
  terms: {
    title: "Terms",
    description: "Information about browsing the collection.",
    sections: [
      ["The collection", "Browse pieces, save favourites and review your selection. Availability, measurements, materials and prices must be confirmed before purchase."],
      ["Online ordering", "Online ordering is currently unavailable. Reviewing a selection does not place an order, take payment or arrange delivery."],
      ["Images and detail", "Colours can vary between screens. Confirm the details and finish of a piece before purchase."],
    ],
  },
  "shipping-returns": {
    title: "Shipping & returns",
    description: "Delivery and exchange information.",
    sections: [
      ["Delivery", "Delivery options and times will be confirmed when online ordering opens. Any shipping amount shown with your selection is an estimate."],
      ["Exchanges and returns", "Eligibility, return arrangements and refund terms will be available before orders are accepted."],
      ["Your selection", "Saving or reviewing pieces does not reserve stock or arrange a delivery."],
    ],
  },
} as const;

import * as lucide from "lucide-react";

const icons = [
  "Utensils", "ShoppingBag", "Pill", "Beer", "Dog", "Store", "Tag", "ChefHat", 
  "Star", "Ticket", "X", "ChevronRight", "Pizza", "Sandwich", "Cake", "Croissant", 
  "Sparkles", "Flame", "Beef", "Leaf", "Package", "IceCream", "Wine", 
  "UtensilsCrossed", "Scissors", "Ruler"
];

const missing = [];
for (const icon of icons) {
  if (!lucide[icon]) {
    missing.push(icon);
  }
}

console.log("Missing icons:", missing);

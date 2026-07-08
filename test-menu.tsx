import React from 'react';
import { renderToString } from 'react-dom/server';
import { MarketplaceMenu } from './src/components/marketplace/MarketplaceMenu.tsx';
import { BrowserRouter } from 'react-router-dom';

try {
  const html = renderToString(
    <BrowserRouter>
      <MarketplaceMenu onSelectCategory={() => {}} onOpenPartnership={() => {}}>
        <button>Test</button>
      </MarketplaceMenu>
    </BrowserRouter>
  );
  console.log("Render successful!");
} catch (error) {
  console.error("Render failed:");
  console.error(error);
}

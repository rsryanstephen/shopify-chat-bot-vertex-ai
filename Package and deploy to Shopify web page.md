### 1. Cross-Origin Resource Sharing (CORS)

Since our backend will live on one URL (like a Cloud Run URL) and our frontend might live on another (like `ourwebsite.wixsite.com`), our Python code will need to handle "CORS" properly. I have included this in the platform agnostic initial prompt, but we should be aware that this is usually the #1 reason why chatbots fail to load on external sites.

Update `allow_origins` in `main.py` accordingly:

```allow_origins=[
allow_origins=[   
	"http://localhost:4200",
        "https://danntech.myshopify.com",
        "https://www.danntech.co.za" # If applicable
    ],
```

---

Run `npm run build:elements`. You will get a single `chatbot-widget.js` file.

Shopify handles file hosting via its own CDN. You need to get your compiled `chatbot-widget.js` file into their ecosystem.

1. In your Shopify Admin panel, go to  **Content > Files** .
2. Click **Upload files** and select your compiled `chatbot-widget.js`.
3. Once uploaded, Shopify will generate a CDN link (e.g., `https://cdn.shopify.com/s/files/.../chatbot-widget.js`). Copy this URL.

### Embedding Strategy: Injecting into the Shopify Theme

Since chatbots usually sit in the bottom corner of every page across the entire website, you should inject the Web Component directly into your global theme file.

1. Go to  **Online Store > Themes** .
2. Click the three dots (`...`) next to your current theme and select  **Edit code** .
3. Under the **Layout** folder, open `theme.liquid`.
4. Scroll to the very bottom of the file, right above the closing `</body>` tag, and paste your script and custom element:
   (We will use Liquid logic to check if a user is viewing a product and pass the product's name (and even its URL or price) directly into the `page-context` attribute.)

**HTML**

```
    <script src="https://cdn.shopify.com/s/files/.../chatbot-widget.js" defer></script>
    {% if product %}
      <chatbot-widget page-context="Product Name: {{ product.title | escape }}, Price: {{ product.price | money }}"></chatbot-widget>
    {% elsif collection %}
      <chatbot-widget page-context="Collection Page: {{ collection.title | escape }}"></chatbot-widget>
    {% else %}
      <chatbot-widget page-context="General Store Navigation. Not on a specific product page."></chatbot-widget>
    {% endif %}
  </body>
</html>
```

By structuring it this way, if a user is looking at a $25 red shirt and asks, "Does this come in blue?", the LLM will parse the hidden system prompt (`Product Name: Red Shirt, Price: $25.00`), cross-reference it with your Vertex AI Data Store, and confidently answer the question without the user ever having to specify what "this" is.

6. Click  **Save** .

*Note: If you only want the chatbot on a specific page (like a dedicated FAQ page), do not edit `theme.liquid`. Instead, go to the Shopify Theme Customizer, navigate to that specific page, add a **Custom Liquid** section, and paste the code snippet *there.*

---

### 4. Content Security Policy (CSP) Considerations

Shopify is generally permissive with custom scripts added directly to the theme, but if you have strict third-party security apps installed, you may need to whitelist your backend Cloud Run URL (e.g., `https://your-backend-xyz.run.app`). Ensure your browser console isn't blocking the `POST` request to your FastAPI server due to CSP.

# Data Generation Templates

This directory contains pre-built templates for generating realistic mock data using Faker.js.

## Available Templates

### users-generated.json
Generates user profiles with:
- UUID identifiers
- Names (first and last)
- Email addresses
- Phone numbers
- Avatar images
- Age (18-80)
- Active status
- User roles
- Creation timestamps

**Endpoint**: `GET /api/generated/users`
**Count**: 20 users

### products-generated.json
Generates e-commerce products with:
- UUID identifiers
- Product names
- Descriptions
- Prices
- Categories
- Stock status
- Quantities
- Images
- Colors
- Tags (array)
- Manufacturer information (nested object)
- Timestamps

**Endpoint**: `GET /api/generated/products`
**Count**: 50 products

### posts-generated.json
Generates blog posts with:
- UUID identifiers
- Titles
- Content
- Author information (nested object)
- Tags (array)
- View counts
- Like counts
- Published status
- Timestamps

**Endpoint**: `GET /api/generated/posts`
**Count**: 30 posts

## Usage

### 1. Copy Template to Data Directory

```bash
cp data/templates/users-generated.json data/
```

### 2. Configure Environment

Ensure your `.env.local` or `.env.production` has:

```env
MOCK_DATA_PATH=./data
```

### 3. Start Server

```bash
npm run dev
```

### 4. Access Generated Data

```bash
curl http://localhost:3000/api/generated/users
```

## Customizing Templates

You can modify any template to suit your needs:

### Change Count

```json
{
  "response": {
    "count": 100  // Generate 100 items instead of default
  }
}
```

### Add Fields

```json
{
  "fields": {
    "existingField": { "type": "name" },
    "newField": { "type": "email" }  // Add new field
  }
}
```

### Modify Field Types

```json
{
  "age": {
    "type": "number",
    "min": 25,  // Change minimum age
    "max": 65   // Change maximum age
  }
}
```

### Add Enum Values

```json
{
  "status": {
    "type": "string",
    "enum": ["active", "inactive", "suspended", "pending"]
  }
}
```

## Creating Your Own Templates

1. Create a new JSON file in `data/` directory
2. Define the endpoint and schema:

```json
{
  "endpoints": [
    {
      "method": "GET",
      "path": "/api/your-endpoint",
      "statusCode": 200,
      "response": {
        "name": "yourSchema",
        "count": 10,
        "fields": {
          "id": { "type": "uuid" },
          "name": { "type": "name" }
        }
      }
    }
  ]
}
```

3. Restart the server or reload configuration

## Field Types Reference

See the [Data Generation Guide](../../docs/DATA_GENERATION_GUIDE.md) for a complete list of supported field types and options.

## Tips

- Use realistic ranges for numbers (age, prices, etc.)
- Leverage nested objects for complex data structures
- Use arrays for collections (tags, images, etc.)
- Set appropriate enum values for status fields
- Use seeds for reproducible data in testing

## Examples

### Minimal User Template

```json
{
  "endpoints": [
    {
      "method": "GET",
      "path": "/api/simple-users",
      "response": {
        "name": "simpleUsers",
        "count": 5,
        "fields": {
          "id": { "type": "uuid" },
          "name": { "type": "name" },
          "email": { "type": "email" }
        }
      }
    }
  ]
}
```

### Complex Product Template

```json
{
  "endpoints": [
    {
      "method": "GET",
      "path": "/api/detailed-products",
      "response": {
        "name": "detailedProducts",
        "count": 25,
        "fields": {
          "id": { "type": "uuid" },
          "name": { "type": "product" },
          "price": { "type": "price", "min": 10, "max": 500 },
          "category": {
            "type": "string",
            "enum": ["Electronics", "Clothing", "Food"]
          },
          "specifications": {
            "type": "object",
            "properties": {
              "weight": { "type": "number", "min": 1, "max": 100 },
              "color": { "type": "color" },
              "dimensions": { "type": "string", "length": 15 }
            }
          },
          "images": {
            "type": "array",
            "length": 3,
            "items": { "type": "image" }
          }
        }
      }
    }
  ]
}
```

## Troubleshooting

### Template Not Loading

- Ensure the file is in the `data/` directory (not `data/templates/`)
- Check JSON syntax is valid
- Verify `MOCK_DATA_PATH` environment variable
- Restart the server after adding new templates

### Generated Data Looks Wrong

- Check field types match your expectations
- Verify min/max ranges are appropriate
- Ensure enum values are correct
- Review the schema structure

### Endpoint Not Found

- Verify the path in your template
- Check for typos in the endpoint path
- Ensure the method (GET, POST, etc.) is correct
- Reload configuration: `POST /admin/reload`

## Further Reading

- [Data Generation Guide](../../docs/DATA_GENERATION_GUIDE.md) - Complete guide
- [API Reference](../../docs/API_REFERENCE.md) - API documentation
- [Faker.js Documentation](https://fakerjs.dev/) - Faker.js API reference

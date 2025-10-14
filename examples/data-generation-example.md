# Data Generation Examples

This document provides practical examples of using the data generation feature.

## Basic Examples

### Simple User List

Create `data/simple-users.json`:

```json
{
  "endpoints": [
    {
      "method": "GET",
      "path": "/api/simple-users",
      "response": {
        "name": "simpleUsers",
        "count": 10,
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

**Request:**
```bash
curl http://localhost:3000/api/simple-users
```

**Response:**
```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "John Doe",
    "email": "john.doe@example.com"
  },
  {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "name": "Jane Smith",
    "email": "jane.smith@example.com"
  }
  // ... 8 more users
]
```

### Product Catalog

Create `data/products.json`:

```json
{
  "endpoints": [
    {
      "method": "GET",
      "path": "/api/products",
      "response": {
        "name": "products",
        "count": 25,
        "fields": {
          "id": { "type": "uuid" },
          "name": { "type": "product" },
          "price": { "type": "price", "min": 10, "max": 500 },
          "category": {
            "type": "string",
            "enum": ["Electronics", "Clothing", "Home", "Sports"]
          },
          "inStock": { "type": "boolean" },
          "image": { "type": "image" }
        }
      }
    }
  ]
}
```

## Advanced Examples

### User Profile with Nested Data

```json
{
  "endpoints": [
    {
      "method": "GET",
      "path": "/api/user-profiles",
      "response": {
        "name": "userProfiles",
        "count": 15,
        "fields": {
          "id": { "type": "uuid" },
          "username": { "faker": "internet.userName" },
          "profile": {
            "type": "object",
            "properties": {
              "firstName": { "type": "firstName" },
              "lastName": { "type": "lastName" },
              "email": { "type": "email" },
              "phone": { "type": "phone" },
              "avatar": { "type": "avatar" },
              "bio": { "type": "paragraph" }
            }
          },
          "address": {
            "type": "object",
            "properties": {
              "street": { "type": "address" },
              "city": { "type": "city" },
              "country": { "type": "country" },
              "zipCode": { "type": "zipCode" }
            }
          },
          "preferences": {
            "type": "object",
            "properties": {
              "theme": {
                "type": "string",
                "enum": ["light", "dark", "auto"]
              },
              "language": {
                "type": "string",
                "enum": ["en", "es", "fr", "de"]
              },
              "notifications": { "type": "boolean" }
            }
          },
          "tags": {
            "type": "array",
            "length": 5,
            "items": { "type": "word" }
          },
          "createdAt": { "type": "date", "format": "iso" }
        }
      }
    }
  ]
}
```

### E-commerce Order

```json
{
  "endpoints": [
    {
      "method": "GET",
      "path": "/api/orders",
      "response": {
        "name": "orders",
        "count": 50,
        "fields": {
          "orderId": { "type": "uuid" },
          "orderNumber": {
            "type": "string",
            "length": 10
          },
          "customer": {
            "type": "object",
            "properties": {
              "id": { "type": "uuid" },
              "name": { "type": "name" },
              "email": { "type": "email" }
            }
          },
          "items": {
            "type": "array",
            "length": 3,
            "items": {
              "type": "object",
              "properties": {
                "productId": { "type": "uuid" },
                "name": { "type": "product" },
                "quantity": { "type": "number", "min": 1, "max": 5 },
                "price": { "type": "price", "min": 10, "max": 200 }
              }
            }
          },
          "total": { "type": "price", "min": 50, "max": 1000 },
          "status": {
            "type": "string",
            "enum": ["pending", "processing", "shipped", "delivered", "cancelled"]
          },
          "shippingAddress": {
            "type": "object",
            "properties": {
              "street": { "type": "address" },
              "city": { "type": "city" },
              "country": { "type": "country" },
              "zipCode": { "type": "zipCode" }
            }
          },
          "createdAt": { "type": "date", "format": "iso" },
          "updatedAt": { "type": "date", "format": "iso" }
        }
      }
    }
  ]
}
```

### Blog with Comments

```json
{
  "endpoints": [
    {
      "method": "GET",
      "path": "/api/blog-posts",
      "response": {
        "name": "blogPosts",
        "count": 20,
        "fields": {
          "id": { "type": "uuid" },
          "title": { "type": "sentence" },
          "slug": { "faker": "helpers.slugify" },
          "content": { "type": "paragraph" },
          "excerpt": { "type": "sentence" },
          "author": {
            "type": "object",
            "properties": {
              "id": { "type": "uuid" },
              "name": { "type": "name" },
              "email": { "type": "email" },
              "avatar": { "type": "avatar" },
              "bio": { "type": "sentence" }
            }
          },
          "category": {
            "type": "string",
            "enum": ["Technology", "Lifestyle", "Business", "Travel", "Food"]
          },
          "tags": {
            "type": "array",
            "length": 4,
            "items": { "type": "word" }
          },
          "coverImage": { "type": "image" },
          "published": { "type": "boolean" },
          "views": { "type": "number", "min": 0, "max": 50000 },
          "likes": { "type": "number", "min": 0, "max": 5000 },
          "comments": {
            "type": "array",
            "length": 3,
            "items": {
              "type": "object",
              "properties": {
                "id": { "type": "uuid" },
                "author": { "type": "name" },
                "content": { "type": "sentence" },
                "createdAt": { "type": "date", "format": "iso" }
              }
            }
          },
          "publishedAt": { "type": "date", "format": "iso" }
        }
      }
    }
  ]
}
```

## Using with CRUD Operations

When `ENABLE_CRUD=true`, generated data supports full CRUD operations:

### GET - Retrieve Generated Data
```bash
curl http://localhost:3000/api/products
```

### POST - Add New Item
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Custom Product",
    "price": "99.99",
    "category": "Electronics",
    "inStock": true
  }'
```

### PUT - Update Item
```bash
curl -X PUT http://localhost:3000/api/products/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Product",
    "price": "149.99"
  }'
```

### DELETE - Remove Item
```bash
curl -X DELETE http://localhost:3000/api/products/1
```

## Reproducible Data with Seeds

For consistent test data across runs:

```json
{
  "endpoints": [
    {
      "method": "GET",
      "path": "/api/test-users",
      "response": {
        "name": "testUsers",
        "count": 10,
        "fields": {
          "id": { "type": "uuid" },
          "name": { "type": "name" },
          "email": { "type": "email" }
        },
        "options": {
          "seed": 12345
        }
      }
    }
  ]
}
```

With the same seed, you'll always get the same generated data.

## Custom Faker Methods

Use any Faker.js method with dot notation:

```json
{
  "fields": {
    "username": { "faker": "internet.userName" },
    "domain": { "faker": "internet.domainName" },
    "ipAddress": { "faker": "internet.ip" },
    "userAgent": { "faker": "internet.userAgent" },
    "creditCard": { "faker": "finance.creditCardNumber" },
    "iban": { "faker": "finance.iban" },
    "bitcoinAddress": { "faker": "finance.bitcoinAddress" },
    "hexColor": { "faker": "internet.color" },
    "emoji": { "faker": "internet.emoji" }
  }
}
```

## Testing Scenarios

### Pagination Simulation

Generate large datasets and implement pagination in your client:

```json
{
  "name": "largeDataset",
  "count": 1000,
  "fields": {
    "id": { "type": "uuid" },
    "name": { "type": "name" }
  }
}
```

### Different User Roles

```json
{
  "fields": {
    "role": {
      "type": "string",
      "enum": ["admin", "moderator", "user", "guest"]
    },
    "permissions": {
      "type": "array",
      "length": 3,
      "items": {
        "type": "string",
        "enum": ["read", "write", "delete", "admin"]
      }
    }
  }
}
```

### Status Workflows

```json
{
  "fields": {
    "status": {
      "type": "string",
      "enum": ["draft", "pending", "approved", "rejected", "published"]
    },
    "statusHistory": {
      "type": "array",
      "length": 2,
      "items": {
        "type": "object",
        "properties": {
          "status": {
            "type": "string",
            "enum": ["draft", "pending", "approved"]
          },
          "timestamp": { "type": "date", "format": "iso" }
        }
      }
    }
  }
}
```

## Tips and Best Practices

1. **Start Simple**: Begin with basic schemas and add complexity as needed
2. **Use Appropriate Types**: Choose field types that match your data semantics
3. **Set Realistic Ranges**: Use min/max values that make sense for your domain
4. **Leverage Enums**: For fields with limited options, use enums
5. **Test with Seeds**: Use seeds for reproducible test data
6. **Combine with Transformations**: Use transformation middleware for additional data manipulation
7. **Monitor Performance**: Large counts (1000+) may impact response time

## Next Steps

- Explore [Data Generation Guide](../docs/DATA_GENERATION_GUIDE.md) for complete documentation
- Check [data/templates/](../data/templates/) for more examples
- Review [Faker.js API](https://fakerjs.dev/api/) for all available methods

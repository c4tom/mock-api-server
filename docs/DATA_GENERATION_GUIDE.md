# Data Generation Guide

This guide explains how to use the Mock API Server's data generation feature powered by Faker.js to create realistic test data on-the-fly.

## Overview

The data generation feature allows you to define schemas that automatically generate realistic mock data without manually creating JSON files. This is particularly useful for:

- Rapid prototyping with realistic data
- Testing with large datasets
- Simulating various data scenarios
- Reducing manual mock data setup

## Quick Start

### Basic Example

Create a JSON file in your `data/` directory with a generation schema:

```json
{
  "endpoints": [
    {
      "method": "GET",
      "path": "/api/users",
      "response": {
        "name": "users",
        "count": 10,
        "fields": {
          "id": { "type": "uuid" },
          "name": { "type": "name" },
          "email": { "type": "email" },
          "age": { "type": "number", "min": 18, "max": 80 }
        }
      }
    }
  ]
}
```

When you request `GET /api/users`, the server will generate 10 user objects with realistic data.

## Schema Structure

### Generation Schema

```typescript
{
  "name": "schema-name",      // Schema identifier
  "count": 10,                // Number of items to generate (default: 10)
  "fields": {                 // Field definitions
    "fieldName": {
      "type": "fieldType",    // Field type (see supported types below)
      // Additional options based on type
    }
  }
}
```

### Field Schema

Each field in the schema can have the following properties:

```typescript
{
  "type": "string",           // Required: Field type
  "min": 0,                   // Optional: Minimum value (for numbers)
  "max": 100,                 // Optional: Maximum value (for numbers)
  "length": 10,               // Optional: Length (for strings/arrays)
  "format": "iso",            // Optional: Format (for dates)
  "enum": ["a", "b", "c"],    // Optional: Enum values
  "faker": "internet.email",  // Optional: Custom faker method
  "items": { },               // Optional: Array item schema
  "properties": { }           // Optional: Object properties
}
```

## Supported Field Types

### Basic Types

#### String
```json
{
  "type": "string",
  "length": 10
}
```
Generates a random string of specified length.

#### Number
```json
{
  "type": "number",
  "min": 1,
  "max": 100
}
```
Generates a random number within the specified range.

#### Boolean
```json
{
  "type": "boolean"
}
```
Generates a random true/false value.

#### Date
```json
{
  "type": "date",
  "format": "iso"
}
```
Generates a random date. Formats: `iso` (default), `timestamp`.

### Person Types

#### Name
```json
{ "type": "name" }
```
Generates a full name (e.g., "John Doe").

#### First Name
```json
{ "type": "firstName" }
```
Generates a first name (e.g., "John").

#### Last Name
```json
{ "type": "lastName" }
```
Generates a last name (e.g., "Doe").

#### Email
```json
{ "type": "email" }
```
Generates an email address (e.g., "john.doe@example.com").

#### Phone
```json
{ "type": "phone" }
```
Generates a phone number.

#### Job Title
```json
{ "type": "jobTitle" }
```
Generates a job title (e.g., "Software Engineer").

### Location Types

#### Address
```json
{ "type": "address" }
```
Generates a street address.

#### City
```json
{ "type": "city" }
```
Generates a city name.

#### Country
```json
{ "type": "country" }
```
Generates a country name.

#### Zip Code
```json
{ "type": "zipCode" }
```
Generates a zip/postal code.

### Company Types

#### Company
```json
{ "type": "company" }
```
Generates a company name.

### Internet Types

#### URL
```json
{ "type": "url" }
```
Generates a URL.

#### UUID
```json
{ "type": "uuid" }
```
Generates a UUID v4.

#### Avatar
```json
{ "type": "avatar" }
```
Generates an avatar image URL.

#### Image
```json
{ "type": "image" }
```
Generates a random image URL.

### Text Types

#### Paragraph
```json
{ "type": "paragraph" }
```
Generates a paragraph of lorem ipsum text.

#### Sentence
```json
{ "type": "sentence" }
```
Generates a sentence.

#### Word
```json
{ "type": "word" }
```
Generates a single word.

### Commerce Types

#### Product
```json
{ "type": "product" }
```
Generates a product name.

#### Price
```json
{
  "type": "price",
  "min": 10,
  "max": 1000
}
```
Generates a price value.

#### Color
```json
{ "type": "color" }
```
Generates a color name.

### Complex Types

#### Array
```json
{
  "type": "array",
  "length": 5,
  "items": {
    "type": "string"
  }
}
```
Generates an array of items based on the items schema.

#### Object
```json
{
  "type": "object",
  "properties": {
    "name": { "type": "name" },
    "email": { "type": "email" }
  }
}
```
Generates a nested object with specified properties.

### Enum Values
```json
{
  "type": "string",
  "enum": ["admin", "user", "guest"]
}
```
Randomly selects a value from the provided array.

### Custom Faker Methods
```json
{
  "faker": "internet.domainName"
}
```
Calls a custom Faker.js method. Use dot notation to access nested methods.

## Complete Examples

### User Profile Schema

```json
{
  "name": "userProfiles",
  "count": 25,
  "fields": {
    "id": {
      "type": "uuid"
    },
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
    "employment": {
      "type": "object",
      "properties": {
        "company": { "type": "company" },
        "jobTitle": { "type": "jobTitle" }
      }
    },
    "preferences": {
      "type": "object",
      "properties": {
        "theme": {
          "type": "string",
          "enum": ["light", "dark", "auto"]
        },
        "notifications": { "type": "boolean" }
      }
    },
    "tags": {
      "type": "array",
      "length": 3,
      "items": {
        "type": "word"
      }
    },
    "createdAt": {
      "type": "date",
      "format": "iso"
    }
  }
}
```

### E-commerce Product Schema

```json
{
  "name": "products",
  "count": 100,
  "fields": {
    "id": { "type": "uuid" },
    "sku": {
      "type": "string",
      "length": 8
    },
    "name": { "type": "product" },
    "description": { "type": "paragraph" },
    "price": {
      "type": "price",
      "min": 5,
      "max": 500
    },
    "salePrice": {
      "type": "price",
      "min": 5,
      "max": 400
    },
    "category": {
      "type": "string",
      "enum": ["Electronics", "Clothing", "Home", "Sports", "Books"]
    },
    "brand": { "type": "company" },
    "inStock": { "type": "boolean" },
    "quantity": {
      "type": "number",
      "min": 0,
      "max": 500
    },
    "rating": {
      "type": "number",
      "min": 1,
      "max": 5
    },
    "reviews": {
      "type": "number",
      "min": 0,
      "max": 1000
    },
    "images": {
      "type": "array",
      "length": 4,
      "items": {
        "type": "image"
      }
    },
    "tags": {
      "type": "array",
      "length": 5,
      "items": {
        "type": "word"
      }
    },
    "specifications": {
      "type": "object",
      "properties": {
        "weight": {
          "type": "number",
          "min": 1,
          "max": 100
        },
        "dimensions": {
          "type": "string",
          "length": 15
        },
        "color": { "type": "color" }
      }
    },
    "createdAt": { "type": "date" },
    "updatedAt": { "type": "date" }
  }
}
```

### Blog Post Schema

```json
{
  "name": "blogPosts",
  "count": 50,
  "fields": {
    "id": { "type": "uuid" },
    "title": { "type": "sentence" },
    "slug": {
      "faker": "helpers.slugify"
    },
    "content": { "type": "paragraph" },
    "excerpt": { "type": "sentence" },
    "author": {
      "type": "object",
      "properties": {
        "id": { "type": "uuid" },
        "name": { "type": "name" },
        "email": { "type": "email" },
        "avatar": { "type": "avatar" }
      }
    },
    "category": {
      "type": "string",
      "enum": ["Technology", "Lifestyle", "Business", "Travel", "Food"]
    },
    "tags": {
      "type": "array",
      "length": 4,
      "items": {
        "type": "word"
      }
    },
    "coverImage": { "type": "image" },
    "published": { "type": "boolean" },
    "views": {
      "type": "number",
      "min": 0,
      "max": 50000
    },
    "likes": {
      "type": "number",
      "min": 0,
      "max": 5000
    },
    "comments": {
      "type": "number",
      "min": 0,
      "max": 500
    },
    "publishedAt": { "type": "date" },
    "updatedAt": { "type": "date" }
  }
}
```

## Generation Options

You can configure generation behavior using options:

```json
{
  "name": "users",
  "count": 10,
  "fields": { ... },
  "options": {
    "locale": "en",
    "seed": 12345
  }
}
```

### Seed

Setting a seed ensures reproducible data generation:

```json
{
  "options": {
    "seed": 12345
  }
}
```

With the same seed, you'll always get the same generated data.

## Using Templates

Pre-built templates are available in `data/templates/`:

- `users-generated.json` - User profiles
- `products-generated.json` - E-commerce products
- `posts-generated.json` - Blog posts

To use a template:

1. Copy the template to your `data/` directory
2. Modify the schema as needed
3. Restart the server or reload configuration

## Combining with CRUD

Generated data works seamlessly with CRUD operations:

```json
{
  "endpoints": [
    {
      "method": "GET",
      "path": "/api/users",
      "response": {
        "name": "users",
        "count": 20,
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

With `ENABLE_CRUD=true`, you can:
- `GET /api/users` - Get generated users
- `POST /api/users` - Add new users
- `PUT /api/users/:id` - Update users
- `DELETE /api/users/:id` - Delete users

## Best Practices

### 1. Use Appropriate Types
Choose field types that match your data semantics:
```json
{
  "email": { "type": "email" },  // Not "string"
  "age": { "type": "number" }    // Not "string"
}
```

### 2. Set Realistic Ranges
Use min/max to create realistic data:
```json
{
  "age": { "type": "number", "min": 18, "max": 80 },
  "price": { "type": "price", "min": 10, "max": 1000 }
}
```

### 3. Use Enums for Fixed Values
For fields with limited options:
```json
{
  "status": {
    "type": "string",
    "enum": ["active", "inactive", "pending"]
  }
}
```

### 4. Leverage Nested Objects
Structure complex data with nested objects:
```json
{
  "user": {
    "type": "object",
    "properties": {
      "profile": { "type": "object", "properties": { ... } },
      "settings": { "type": "object", "properties": { ... } }
    }
  }
}
```

### 5. Use Seeds for Testing
Use consistent seeds for reproducible test data:
```json
{
  "options": { "seed": 12345 }
}
```

## Troubleshooting

### Generated Data Not Appearing

**Problem**: Endpoint returns empty or static data.

**Solution**: Ensure your schema has the correct structure:
```json
{
  "name": "schemaName",
  "fields": { ... }
}
```

### Custom Faker Method Not Working

**Problem**: Custom faker method returns default data.

**Solution**: Check the method path is correct:
```json
{
  "faker": "internet.email"  // Correct
  // Not: "faker.internet.email"
}
```

### Array Not Generating Multiple Items

**Problem**: Array field generates empty or single item.

**Solution**: Specify length and items schema:
```json
{
  "type": "array",
  "length": 5,
  "items": { "type": "string" }
}
```

## Advanced Usage

### Dynamic Count Based on Query Parameters

While the schema defines a default count, you can implement custom logic in your application to adjust the count based on query parameters.

### Mixing Generated and Static Data

You can combine generated fields with static values:
```json
{
  "fields": {
    "id": { "type": "uuid" },
    "name": { "type": "name" },
    "version": { "type": "string", "enum": ["1.0.0"] }
  }
}
```

### Custom Faker Methods

Explore all available Faker.js methods at: https://fakerjs.dev/api/

Examples:
```json
{
  "ipAddress": { "faker": "internet.ip" },
  "userAgent": { "faker": "internet.userAgent" },
  "creditCard": { "faker": "finance.creditCardNumber" },
  "bitcoinAddress": { "faker": "finance.bitcoinAddress" }
}
```

## Performance Considerations

- Generating large datasets (1000+ items) may impact response time
- Consider caching generated data for frequently accessed endpoints
- Use appropriate count values based on your use case
- For very large datasets, consider pagination

## Examples Repository

Check the `data/templates/` directory for more examples:
- User profiles with complete information
- E-commerce products with specifications
- Blog posts with authors and metadata
- And more...

## Next Steps

- Explore [API Reference](./API_REFERENCE.md) for endpoint details
- Learn about [CRUD operations](./API_REFERENCE.md#crud-operations)
- Check [Transformation Guide](./TRANSFORMATION_GUIDE.md) for data manipulation
- See [Cache Guide](./CACHE_GUIDE.md) for performance optimization

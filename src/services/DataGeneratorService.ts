/**
 * Data Generator Service using Faker.js
 */

import { faker } from '@faker-js/faker';
import {
    IDataGenerator,
    DataGenerationSchema,
    FieldSchema,
    GenerationOptions
} from '../types/generation';

export class DataGeneratorService implements IDataGenerator {
    /**
     * Generate multiple data items based on schema
     */
    generate(schema: DataGenerationSchema, options?: GenerationOptions): any[] {
        this.applyOptions(options);

        const count = schema.count || 10;
        const items: any[] = [];

        for (let i = 0; i < count; i++) {
            items.push(this.generateSingle(schema, options));
        }

        return items;
    }

    /**
     * Generate a single data item based on schema
     */
    generateSingle(schema: DataGenerationSchema, options?: GenerationOptions): any {
        this.applyOptions(options);

        const item: any = {};

        for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
            item[fieldName] = this.generateField(fieldName, fieldSchema);
        }

        return item;
    }

    /**
     * Generate a single field value based on field schema
     */
    generateField(fieldName: string, fieldSchema: FieldSchema): any {
        // Handle custom faker method
        if (fieldSchema.faker) {
            return this.callFakerMethod(fieldSchema.faker);
        }

        // Handle enum values
        if (fieldSchema.enum && fieldSchema.enum.length > 0) {
            return faker.helpers.arrayElement(fieldSchema.enum);
        }

        // Handle different field types
        switch (fieldSchema.type) {
            case 'string':
                return this.generateString(fieldSchema);

            case 'number':
                return this.generateNumber(fieldSchema);

            case 'boolean':
                return faker.datatype.boolean();

            case 'date':
                return this.generateDate(fieldSchema);

            case 'email':
                return faker.internet.email();

            case 'name':
                return faker.person.fullName();

            case 'firstName':
                return faker.person.firstName();

            case 'lastName':
                return faker.person.lastName();

            case 'phone':
                return faker.phone.number();

            case 'address':
                return faker.location.streetAddress();

            case 'city':
                return faker.location.city();

            case 'country':
                return faker.location.country();

            case 'zipCode':
                return faker.location.zipCode();

            case 'company':
                return faker.company.name();

            case 'jobTitle':
                return faker.person.jobTitle();

            case 'url':
                return faker.internet.url();

            case 'uuid':
                return faker.string.uuid();

            case 'image':
                return faker.image.url();

            case 'avatar':
                return faker.image.avatar();

            case 'paragraph':
                return faker.lorem.paragraph();

            case 'sentence':
                return faker.lorem.sentence();

            case 'word':
                return faker.lorem.word();

            case 'price':
                return this.generatePrice(fieldSchema);

            case 'product':
                return faker.commerce.productName();

            case 'color':
                return faker.color.human();

            case 'array':
                return this.generateArray(fieldName, fieldSchema);

            case 'object':
                return this.generateObject(fieldSchema);

            default:
                return faker.lorem.word();
        }
    }

    /**
     * Generate string value
     */
    private generateString(fieldSchema: FieldSchema): string {
        if (fieldSchema.length) {
            return faker.string.alpha(fieldSchema.length);
        }

        if (fieldSchema.min && fieldSchema.max) {
            const length = faker.number.int({ min: fieldSchema.min, max: fieldSchema.max });
            return faker.string.alpha(length);
        }

        return faker.lorem.word();
    }

    /**
     * Generate number value
     */
    private generateNumber(fieldSchema: FieldSchema): number {
        const min = fieldSchema.min ?? 0;
        const max = fieldSchema.max ?? 1000;

        return faker.number.int({ min, max });
    }

    /**
     * Generate date value
     */
    private generateDate(fieldSchema: FieldSchema): string {
        const date = faker.date.recent();

        if (fieldSchema.format === 'iso') {
            return date.toISOString();
        }

        if (fieldSchema.format === 'timestamp') {
            return date.getTime().toString();
        }

        return date.toISOString();
    }

    /**
     * Generate price value
     */
    private generatePrice(fieldSchema: FieldSchema): string {
        const min = fieldSchema.min ?? 1;
        const max = fieldSchema.max ?? 1000;

        return faker.commerce.price({ min, max });
    }

    /**
     * Generate array of values
     */
    private generateArray(fieldName: string, fieldSchema: FieldSchema): any[] {
        if (!fieldSchema.items) {
            return [];
        }

        const length = fieldSchema.length || faker.number.int({ min: 1, max: 5 });
        const array: any[] = [];

        for (let i = 0; i < length; i++) {
            array.push(this.generateField(`${fieldName}[${i}]`, fieldSchema.items));
        }

        return array;
    }

    /**
     * Generate nested object
     */
    private generateObject(fieldSchema: FieldSchema): any {
        if (!fieldSchema.properties) {
            return {};
        }

        const obj: any = {};

        for (const [propName, propSchema] of Object.entries(fieldSchema.properties)) {
            obj[propName] = this.generateField(propName, propSchema);
        }

        return obj;
    }

    /**
     * Call custom faker method by path
     */
    private callFakerMethod(methodPath: string): any {
        try {
            const parts = methodPath.split('.');
            let current: any = faker;

            for (const part of parts) {
                current = current[part];
                if (!current) {
                    throw new Error(`Faker method not found: ${methodPath}`);
                }
            }

            if (typeof current === 'function') {
                return current();
            }

            return current;
        } catch (error) {
            console.warn(`Failed to call faker method ${methodPath}:`, error);
            return faker.lorem.word();
        }
    }

    /**
     * Apply generation options
     */
    private applyOptions(options?: GenerationOptions): void {
        if (!options) {
            return;
        }

        if (options.seed !== undefined) {
            faker.seed(options.seed);
        }

        if (options.locale) {
            // Locale setting would require importing specific locale
            // For now, we'll use the default locale
            console.log(`Locale ${options.locale} requested (using default)`);
        }
    }
}

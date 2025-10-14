/**
 * GraphQL Handler
 * Handles GraphQL queries and mutations for mock data and proxy functionality
 */

import { Request, Response } from 'express';
import { GraphQLSchema, parse, validate, execute, buildSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import axios from 'axios';
import { GraphQLConfig, ProxyAuth } from '../types/config';
import * as fs from 'fs';
import * as path from 'path';

export class GraphQLHandler {
    private config: GraphQLConfig;
    private schema: GraphQLSchema | null = null;
    private mockData: {
        users: any[];
        posts: any[];
        nextUserId: number;
        nextPostId: number;
    } = {
            users: [],
            posts: [],
            nextUserId: 1,
            nextPostId: 1,
        };

    constructor(config: GraphQLConfig) {
        this.config = config;
        this.initializeSchema();
        this.loadMockData();
    }

    /**
     * Initialize GraphQL schema
     */
    private initializeSchema(): void {
        if (this.config.schemaPath) {
            // Load schema from file
            try {
                const schemaPath = path.resolve(this.config.schemaPath);
                if (fs.existsSync(schemaPath)) {
                    const schemaString = fs.readFileSync(schemaPath, 'utf-8');
                    this.schema = buildSchema(schemaString);
                    console.log('GraphQL schema loaded from file:', schemaPath);
                } else {
                    console.warn('GraphQL schema file not found:', schemaPath);
                    this.createDefaultSchema();
                }
            } catch (error) {
                console.error('Error loading GraphQL schema:', error);
                this.createDefaultSchema();
            }
        } else {
            this.createDefaultSchema();
        }
    }

    /**
     * Create a default GraphQL schema for mock data
     */
    private createDefaultSchema(): void {
        const typeDefs = `
      type Query {
        hello: String
        user(id: ID!): User
        users: [User]
        post(id: ID!): Post
        posts: [Post]
      }

      type Mutation {
        createUser(name: String!, email: String!): User
        updateUser(id: ID!, name: String, email: String): User
        deleteUser(id: ID!): Boolean
        createPost(title: String!, content: String!, userId: ID!): Post
        updatePost(id: ID!, title: String, content: String): Post
        deletePost(id: ID!): Boolean
      }

      type User {
        id: ID!
        name: String!
        email: String!
        posts: [Post]
      }

      type Post {
        id: ID!
        title: String!
        content: String!
        userId: ID!
        user: User
      }
    `;

        const resolvers = {
            Query: {
                hello: () => 'Hello from GraphQL Mock Server!',
                user: (_: any, { id }: { id: string }) => this.getUser(id),
                users: () => this.getUsers(),
                post: (_: any, { id }: { id: string }) => this.getPost(id),
                posts: () => this.getPosts(),
            },
            Mutation: {
                createUser: (_: any, { name, email }: { name: string; email: string }) =>
                    this.createUser(name, email),
                updateUser: (_: any, { id, name, email }: { id: string; name?: string; email?: string }) =>
                    this.updateUser(id, name, email),
                deleteUser: (_: any, { id }: { id: string }) => this.deleteUser(id),
                createPost: (_: any, { title, content, userId }: { title: string; content: string; userId: string }) =>
                    this.createPost(title, content, userId),
                updatePost: (_: any, { id, title, content }: { id: string; title?: string; content?: string }) =>
                    this.updatePost(id, title, content),
                deletePost: (_: any, { id }: { id: string }) => this.deletePost(id),
            },
            User: {
                posts: (user: any) => this.getUserPosts(user.id),
            },
            Post: {
                user: (post: any) => this.getUser(post.userId),
            },
        };

        this.schema = makeExecutableSchema({
            typeDefs,
            resolvers,
        });

        console.log('Default GraphQL schema created');
    }

    /**
     * Load mock data from configuration or files
     */
    private loadMockData(): void {
        if (this.config.mockData) {
            // Merge config mock data with default structure
            this.mockData = {
                users: this.config.mockData['users'] || [],
                posts: this.config.mockData['posts'] || [],
                nextUserId: (this.config.mockData['users']?.length || 0) + 1,
                nextPostId: (this.config.mockData['posts']?.length || 0) + 1,
            };
        } else {
            // Already initialized with empty data structures in constructor
            // Try to load from data files
            try {
                const usersPath = path.resolve('./data/users.json');
                if (fs.existsSync(usersPath)) {
                    const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
                    this.mockData.users = Array.isArray(usersData) ? usersData : [];
                    this.mockData.nextUserId = this.mockData.users.length + 1;
                }

                const postsPath = path.resolve('./data/posts.json');
                if (fs.existsSync(postsPath)) {
                    const postsData = JSON.parse(fs.readFileSync(postsPath, 'utf-8'));
                    this.mockData.posts = Array.isArray(postsData) ? postsData : [];
                    this.mockData.nextPostId = this.mockData.posts.length + 1;
                }
            } catch (error) {
                console.warn('Could not load mock data files:', error);
            }
        }

        console.log('GraphQL mock data loaded:', {
            users: this.mockData.users?.length || 0,
            posts: this.mockData.posts?.length || 0,
        });
    }

    /**
     * Handle GraphQL request
     */
    public async handleRequest(req: Request, res: Response): Promise<void> {
        try {
            // Check if GraphQL is enabled
            if (!this.config.enabled) {
                res.status(404).json({
                    error: {
                        code: 'GRAPHQL_NOT_ENABLED',
                        message: 'GraphQL endpoint is not enabled',
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            // Handle GraphQL Playground request (GET)
            if (req.method === 'GET' && this.config.playground) {
                this.sendPlayground(res);
                return;
            }

            // Handle GraphQL query/mutation (POST)
            if (req.method === 'POST') {
                await this.executeGraphQL(req, res);
                return;
            }

            res.status(405).json({
                error: {
                    code: 'METHOD_NOT_ALLOWED',
                    message: 'Only GET and POST methods are allowed for GraphQL endpoint',
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (error) {
            console.error('GraphQL handler error:', error);
            res.status(500).json({
                error: {
                    code: 'GRAPHQL_ERROR',
                    message: error instanceof Error ? error.message : 'GraphQL execution failed',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }

    /**
     * Execute GraphQL query/mutation
     */
    private async executeGraphQL(req: Request, res: Response): Promise<void> {
        const { query, variables, operationName } = req.body;

        if (!query) {
            res.status(400).json({
                error: {
                    code: 'INVALID_REQUEST',
                    message: 'GraphQL query is required',
                    timestamp: new Date().toISOString(),
                },
            });
            return;
        }

        if (!this.schema) {
            res.status(500).json({
                error: {
                    code: 'SCHEMA_NOT_INITIALIZED',
                    message: 'GraphQL schema is not initialized',
                    timestamp: new Date().toISOString(),
                },
            });
            return;
        }

        try {
            // Parse and validate query
            const document = parse(query);
            const validationErrors = validate(this.schema, document);

            if (validationErrors.length > 0) {
                res.status(400).json({
                    errors: validationErrors.map(err => ({
                        message: err.message,
                        locations: err.locations,
                    })),
                });
                return;
            }

            // Execute query
            const result = await execute({
                schema: this.schema,
                document,
                variableValues: variables,
                operationName,
            });

            res.json(result);
        } catch (error) {
            console.error('GraphQL execution error:', error);
            res.status(500).json({
                errors: [{
                    message: error instanceof Error ? error.message : 'GraphQL execution failed',
                }],
            });
        }
    }

    /**
     * Send GraphQL Playground HTML
     */
    private sendPlayground(res: Response): void {
        const playgroundHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>GraphQL Playground</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/graphql-playground-react/build/static/css/index.css" />
  <link rel="shortcut icon" href="https://cdn.jsdelivr.net/npm/graphql-playground-react/build/favicon.png" />
  <script src="https://cdn.jsdelivr.net/npm/graphql-playground-react/build/static/js/middleware.js"></script>
</head>
<body>
  <div id="root"></div>
  <script>
    window.addEventListener('load', function (event) {
      GraphQLPlayground.init(document.getElementById('root'), {
        endpoint: '${this.config.path}',
        settings: {
          'editor.theme': 'dark',
          'editor.cursorShape': 'line',
          'editor.reuseHeaders': true,
          'tracing.hideTracingResponse': true,
          'queryPlan.hideQueryPlanResponse': true,
          'editor.fontSize': 14,
          'editor.fontFamily': "'Source Code Pro', 'Consolas', 'Inconsolata', 'Droid Sans Mono', 'Monaco', monospace",
          'request.credentials': 'include',
        },
      })
    })
  </script>
</body>
</html>
    `;

        res.setHeader('Content-Type', 'text/html');
        res.send(playgroundHTML);
    }

    /**
     * Handle GraphQL proxy request
     */
    public async handleProxyRequest(req: Request, res: Response): Promise<void> {
        try {
            if (!this.config.proxyEnabled || !this.config.proxyEndpoint) {
                res.status(404).json({
                    error: {
                        code: 'GRAPHQL_PROXY_NOT_ENABLED',
                        message: 'GraphQL proxy is not enabled',
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            const { query, variables, operationName } = req.body;

            // Prepare headers
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            // Add authentication if configured
            if (this.config.proxyAuth) {
                this.addAuthHeaders(headers, this.config.proxyAuth);
            }

            // Forward request to external GraphQL endpoint
            const response = await axios.post(
                this.config.proxyEndpoint,
                { query, variables, operationName },
                { headers, timeout: 10000 }
            );

            res.json(response.data);
        } catch (error) {
            console.error('GraphQL proxy error:', error);

            if (axios.isAxiosError(error)) {
                res.status(error.response?.status || 502).json({
                    error: {
                        code: 'GRAPHQL_PROXY_ERROR',
                        message: error.message,
                        details: error.response?.data,
                        timestamp: new Date().toISOString(),
                    },
                });
            } else {
                res.status(500).json({
                    error: {
                        code: 'GRAPHQL_PROXY_ERROR',
                        message: error instanceof Error ? error.message : 'GraphQL proxy failed',
                        timestamp: new Date().toISOString(),
                    },
                });
            }
        }
    }

    /**
     * Add authentication headers
     */
    private addAuthHeaders(headers: Record<string, string>, auth: ProxyAuth): void {
        switch (auth.type) {
            case 'bearer':
                if (auth.token) {
                    headers['Authorization'] = `Bearer ${auth.token}`;
                }
                break;
            case 'basic':
                if (auth.username && auth.password) {
                    const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
                    headers['Authorization'] = `Basic ${credentials}`;
                }
                break;
            case 'apikey':
                if (auth.apiKeyHeader && auth.apiKeyValue) {
                    headers[auth.apiKeyHeader] = auth.apiKeyValue;
                }
                break;
        }
    }

    // Mock data resolver methods
    private getUser(id: string): any {
        return this.mockData.users?.find((u: any) => u.id === id || u.id === parseInt(id));
    }

    private getUsers(): any[] {
        return this.mockData.users || [];
    }

    private getPost(id: string): any {
        return this.mockData.posts?.find((p: any) => p.id === id || p.id === parseInt(id));
    }

    private getPosts(): any[] {
        return this.mockData.posts || [];
    }

    private getUserPosts(userId: string): any[] {
        return this.mockData.posts?.filter((p: any) => p.userId === userId || p.userId === parseInt(userId)) || [];
    }

    private createUser(name: string, email: string): any {
        const newUser = {
            id: this.mockData.nextUserId++,
            name,
            email,
        };
        this.mockData.users.push(newUser);
        return newUser;
    }

    private updateUser(id: string, name?: string, email?: string): any {
        const user = this.getUser(id);
        if (!user) {
            throw new Error(`User with id ${id} not found`);
        }
        if (name) user.name = name;
        if (email) user.email = email;
        return user;
    }

    private deleteUser(id: string): boolean {
        const index = this.mockData.users?.findIndex((u: any) => u.id === id || u.id === parseInt(id));
        if (index !== undefined && index >= 0) {
            this.mockData.users.splice(index, 1);
            return true;
        }
        return false;
    }

    private createPost(title: string, content: string, userId: string): any {
        const newPost = {
            id: this.mockData.nextPostId++,
            title,
            content,
            userId: parseInt(userId),
        };
        this.mockData.posts.push(newPost);
        return newPost;
    }

    private updatePost(id: string, title?: string, content?: string): any {
        const post = this.getPost(id);
        if (!post) {
            throw new Error(`Post with id ${id} not found`);
        }
        if (title) post.title = title;
        if (content) post.content = content;
        return post;
    }

    private deletePost(id: string): boolean {
        const index = this.mockData.posts?.findIndex((p: any) => p.id === id || p.id === parseInt(id));
        if (index !== undefined && index >= 0) {
            this.mockData.posts.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Get GraphQL schema for introspection
     */
    public getSchema(): GraphQLSchema | null {
        return this.schema;
    }

    /**
     * Update configuration
     */
    public updateConfig(config: GraphQLConfig): void {
        this.config = config;
        this.initializeSchema();
        this.loadMockData();
    }
}

// Verso Air ™️ Business Intelligence Platform - JavaScript/Node.js Integration
// Complete Node.js integration for server-side or client-side usage

const https = require('https');
const http = require('http');
const fs = require('fs');

// Data model classes
class Business {
    constructor(data = {}) {
        this.id = data.id || 0;
        this.name = data.name || '';
        this.categoryId = data.categoryId || 0;
        this.ownerId = data.ownerId || 0;
        this.description = data.description || '';
        this.address = data.address || '';
        this.phone = data.phone || '';
        this.email = data.email || '';
        this.website = data.website || '';
    }
}

class Analytics {
    constructor(data = {}) {
        this.id = data.id || 0;
        this.businessId = data.businessId || 0;
        this.categoryId = data.categoryId || 0;
        this.metricType = data.metricType || '';
        this.value = data.value || 0;
        this.period = data.period || '';
        this.recordedAt = data.recordedAt ? new Date(data.recordedAt) : new Date();
    }
}

class BusinessCategory {
    constructor(data = {}) {
        this.id = data.id || 0;
        this.name = data.name || '';
        this.description = data.description || '';
    }
}

class Reservation {
    constructor(data = {}) {
        this.id = data.id || 0;
        this.businessId = data.businessId || 0;
        this.customerName = data.customerName || '';
        this.customerEmail = data.customerEmail || '';
        this.customerPhone = data.customerPhone || '';
        this.reservationDate = data.reservationDate ? new Date(data.reservationDate) : new Date();
        this.partySize = data.partySize || 0;
        this.specialRequests = data.specialRequests || '';
        this.status = data.status || 'pending';
    }
}

class MusicArtist {
    constructor(data = {}) {
        this.id = data.id || 0;
        this.name = data.name || '';
        this.genre = data.genre || '';
        this.totalStreams = data.totalStreams || 0;
        this.monthlyListeners = data.monthlyListeners || 0;
        this.isVerified = data.isVerified || false;
        this.profileImage = data.profileImage || '';
    }
}

class User {
    constructor(data = {}) {
        this.id = data.id || 0;
        this.username = data.username || '';
        this.email = data.email || '';
        this.role = data.role || 'user';
    }
}

// Main API client class
class PlanV4ApiClient {
    constructor(baseUrl = 'http://localhost:5000') {
        this.baseUrl = baseUrl;
        this.timeout = 30000; // 30 seconds
    }

    // Generic HTTP request method
    async makeRequest(method, endpoint, data = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(endpoint, this.baseUrl);
            const isHttps = url.protocol === 'https:';
            const httpModule = isHttps ? https : http;

            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: method.toUpperCase(),
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'PlanV4-Client/1.0'
                },
                timeout: this.timeout
            };

            if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT')) {
                const postData = JSON.stringify(data);
                options.headers['Content-Type'] = 'application/json';
                options.headers['Content-Length'] = Buffer.byteLength(postData);
            }

            const req = httpModule.request(options, (res) => {
                let responseBody = '';

                res.on('data', (chunk) => {
                    responseBody += chunk;
                });

                res.on('end', () => {
                    try {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            const jsonData = responseBody ? JSON.parse(responseBody) : {};
                            resolve(jsonData);
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${responseBody}`));
                        }
                    } catch (error) {
                        reject(new Error(`Failed to parse response: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Request failed: ${error.message}`));
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT')) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    // Business operations
    async getBusinesses() {
        const data = await this.makeRequest('GET', '/api/businesses');
        return data.map(item => new Business(item));
    }

    async createBusiness(business) {
        const data = await this.makeRequest('POST', '/api/businesses', business);
        return new Business(data);
    }

    // Analytics operations
    async getAnalyticsByCategory(category) {
        const data = await this.makeRequest('GET', `/api/analytics/${category}`);
        return data.map(item => new Analytics(item));
    }

    async createAnalytics(analytics) {
        const data = await this.makeRequest('POST', '/api/analytics', analytics);
        return new Analytics(data);
    }

    // Category operations
    async getCategories() {
        const data = await this.makeRequest('GET', '/api/categories');
        return data.map(item => new BusinessCategory(item));
    }

    // Reservation operations
    async getReservations() {
        const data = await this.makeRequest('GET', '/api/reservations');
        return data.map(item => new Reservation(item));
    }

    async createReservation(reservation) {
        const data = await this.makeRequest('POST', '/api/reservations', reservation);
        return new Reservation(data);
    }

    // Music operations
    async getMusicArtists() {
        const data = await this.makeRequest('GET', '/api/music/artists');
        return data.map(item => new MusicArtist(item));
    }

    // Authentication
    async signIn(username, password) {
        const credentials = { username, password };
        const data = await this.makeRequest('POST', '/api/auth/signin', credentials);
        return new User(data);
    }

    // Health check
    async checkHealth() {
        try {
            await this.makeRequest('GET', '/health');
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Service layer for business logic
class PlanV4Service {
    constructor(baseUrl = 'http://localhost:5000') {
        this.apiClient = new PlanV4ApiClient(baseUrl);
    }

    // Get business analytics with error handling
    async getBusinessAnalytics(categoryName) {
        try {
            const analytics = await this.apiClient.getAnalyticsByCategory(categoryName.toLowerCase());
            const result = {};

            analytics.forEach(item => {
                result[item.metricType] = item.value;
            });

            return result;
        } catch (error) {
            console.error(`Error fetching analytics: ${error.message}`);
            return {};
        }
    }

    // Get business summary
    async getBusinessSummary() {
        try {
            const [businesses, categories] = await Promise.all([
                this.apiClient.getBusinesses(),
                this.apiClient.getCategories()
            ]);

            const businessesByCategory = {};
            businesses.forEach(business => {
                const categoryId = business.categoryId;
                businessesByCategory[categoryId] = (businessesByCategory[categoryId] || 0) + 1;
            });

            return {
                totalBusinesses: businesses.length,
                totalCategories: categories.length,
                businessesByCategory,
                lastUpdated: new Date()
            };
        } catch (error) {
            console.error(`Error fetching business summary: ${error.message}`);
            return {};
        }
    }

    // Create new business with validation
    async createBusinessWithValidation(name, categoryId, description, address, phone, email, website) {
        try {
            // Basic validation
            if (!name || name.trim().length === 0) {
                throw new Error('Business name is required');
            }

            if (!categoryId || categoryId <= 0) {
                throw new Error('Valid category is required');
            }

            const business = new Business({
                name: name.trim(),
                categoryId,
                ownerId: 1, // Default owner
                description: description || '',
                address: address || '',
                phone: phone || '',
                email: email || '',
                website: website || ''
            });

            const result = await this.apiClient.createBusiness(business);
            return result && result.id > 0;
        } catch (error) {
            console.error(`Error creating business: ${error.message}`);
            return false;
        }
    }

    // Get trending music data
    async getTrendingMusic() {
        try {
            const artists = await this.apiClient.getMusicArtists();
            return artists.sort((a, b) => b.totalStreams - a.totalStreams).slice(0, 10);
        } catch (error) {
            console.error(`Error fetching trending music: ${error.message}`);
            return [];
        }
    }

    // Book reservation
    async bookReservation(businessId, customerName, customerEmail, customerPhone, reservationDate, partySize, specialRequests) {
        try {
            const reservation = new Reservation({
                businessId,
                customerName,
                customerEmail,
                customerPhone,
                reservationDate,
                partySize,
                specialRequests: specialRequests || '',
                status: 'pending'
            });

            const result = await this.apiClient.createReservation(reservation);
            return result && result.id > 0;
        } catch (error) {
            console.error(`Error booking reservation: ${error.message}`);
            return false;
        }
    }

    // Health check with retry
    async isServiceHealthy(retryCount = 3) {
        for (let i = 0; i < retryCount; i++) {
            try {
                const isHealthy = await this.apiClient.checkHealth();
                if (isHealthy) return true;

                if (i < retryCount - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                }
            } catch (error) {
                // Continue to next retry
            }
        }
        return false;
    }

    // Export data to file
    async exportBusinessesToFile(filename = 'businesses.json') {
        try {
            const businesses = await this.apiClient.getBusinesses();
            const data = JSON.stringify(businesses, null, 2);
            fs.writeFileSync(filename, data);
            console.log(`Exported ${businesses.length} businesses to ${filename}`);
            return true;
        } catch (error) {
            console.error(`Error exporting businesses: ${error.message}`);
            return false;
        }
    }

    // Import data from file
    async importBusinessesFromFile(filename) {
        try {
            const data = fs.readFileSync(filename, 'utf8');
            const businesses = JSON.parse(data);
            
            let successCount = 0;
            for (const businessData of businesses) {
                const success = await this.createBusinessWithValidation(
                    businessData.name,
                    businessData.categoryId,
                    businessData.description,
                    businessData.address,
                    businessData.phone,
                    businessData.email,
                    businessData.website
                );
                if (success) successCount++;
            }

            console.log(`Imported ${successCount} out of ${businesses.length} businesses`);
            return successCount;
        } catch (error) {
            console.error(`Error importing businesses: ${error.message}`);
            return 0;
        }
    }
}

// Console application example
class PlanV4ConsoleApp {
    constructor() {
        this.service = new PlanV4Service();
    }

    async run() {
        try {
            console.log('Plan V4 Business Intelligence Platform - Console Client');
            console.log('=' * 50);

            // Health check
            console.log('Checking service health...');
            const isHealthy = await this.service.isServiceHealthy();
            console.log(`Service status: ${isHealthy ? 'Healthy' : 'Unhealthy'}`);

            if (!isHealthy) {
                console.log('Service is not available. Please ensure the server is running.');
                return;
            }

            // Get business summary
            console.log('\nFetching business summary...');
            const summary = await this.service.getBusinessSummary();
            console.log(`Total businesses: ${summary.totalBusinesses}`);
            console.log(`Total categories: ${summary.totalCategories}`);

            // Get categories
            console.log('\nAvailable categories:');
            const categories = await this.service.apiClient.getCategories();
            categories.forEach(category => {
                console.log(`- ${category.name}: ${category.description}`);
            });

            // Get analytics for each category
            console.log('\nCategory Analytics:');
            for (const category of categories) {
                const analytics = await this.service.getBusinessAnalytics(category.name);
                console.log(`\n${category.name}:`);
                Object.entries(analytics).forEach(([metric, value]) => {
                    console.log(`  ${metric}: ${value}`);
                });
            }

            // Get trending music
            console.log('\nTrending Music Artists:');
            const artists = await this.service.getTrendingMusic();
            artists.forEach((artist, index) => {
                console.log(`${index + 1}. ${artist.name} - ${artist.totalStreams.toLocaleString()} streams`);
            });

            console.log('\nApplication completed successfully!');

        } catch (error) {
            console.error(`Application error: ${error.message}`);
        }
    }

    async interactiveMode() {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const question = (prompt) => {
            return new Promise(resolve => {
                rl.question(prompt, resolve);
            });
        };

        try {
            console.log('Plan V4 Interactive Mode');
            console.log('Available commands: businesses, analytics, artists, create, export, quit');

            while (true) {
                const command = await question('\nEnter command: ');

                switch (command.toLowerCase()) {
                    case 'businesses':
                        const businesses = await this.service.apiClient.getBusinesses();
                        console.log(`Found ${businesses.length} businesses:`);
                        businesses.forEach(business => {
                            console.log(`- ${business.name} (${business.address})`);
                        });
                        break;

                    case 'analytics':
                        const category = await question('Enter category (commerce, hotellerie, etc.): ');
                        const analytics = await this.service.getBusinessAnalytics(category);
                        console.log(`Analytics for ${category}:`);
                        Object.entries(analytics).forEach(([metric, value]) => {
                            console.log(`  ${metric}: ${value}`);
                        });
                        break;

                    case 'artists':
                        const artists = await this.service.getTrendingMusic();
                        console.log('Trending Artists:');
                        artists.forEach((artist, index) => {
                            console.log(`${index + 1}. ${artist.name} - ${artist.genre}`);
                        });
                        break;

                    case 'create':
                        const name = await question('Business name: ');
                        const categoryId = parseInt(await question('Category ID: '));
                        const description = await question('Description: ');
                        const success = await this.service.createBusinessWithValidation(
                            name, categoryId, description, '', '', '', ''
                        );
                        console.log(success ? 'Business created successfully!' : 'Failed to create business.');
                        break;

                    case 'export':
                        const filename = await question('Export filename (default: businesses.json): ') || 'businesses.json';
                        await this.service.exportBusinessesToFile(filename);
                        break;

                    case 'quit':
                        console.log('Goodbye!');
                        rl.close();
                        return;

                    default:
                        console.log('Unknown command. Available: businesses, analytics, artists, create, export, quit');
                }
            }
        } catch (error) {
            console.error(`Interactive mode error: ${error.message}`);
            rl.close();
        }
    }
}

// Module exports for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PlanV4ApiClient,
        PlanV4Service,
        PlanV4ConsoleApp,
        Business,
        Analytics,
        BusinessCategory,
        Reservation,
        MusicArtist,
        User
    };
}

// Example usage
if (require.main === module) {
    const app = new PlanV4ConsoleApp();
    
    // Check command line arguments
    const args = process.argv.slice(2);
    if (args.includes('--interactive') || args.includes('-i')) {
        app.interactiveMode();
    } else {
        app.run();
    }
}

// Browser compatibility (if using in client-side)
if (typeof window !== 'undefined') {
    window.PlanV4 = {
        ApiClient: PlanV4ApiClient,
        Service: PlanV4Service,
        Models: {
            Business,
            Analytics,
            BusinessCategory,
            Reservation,
            MusicArtist,
            User
        }
    };
}
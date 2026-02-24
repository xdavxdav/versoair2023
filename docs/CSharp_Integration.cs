// Verso Air ™️ Business Intelligence Platform - C# Integration
// Complete C# integration code for Visual Studio Code

using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using System.Windows.Forms;
using System.Linq;

// Data models matching the API schema
public class Business
{
    public int Id { get; set; }
    public string Name { get; set; }
    public int CategoryId { get; set; }
    public int OwnerId { get; set; }
    public string Description { get; set; }
    public string Address { get; set; }
    public string Phone { get; set; }
    public string Email { get; set; }
    public string Website { get; set; }
}

public class Analytics
{
    public int Id { get; set; }
    public int BusinessId { get; set; }
    public int CategoryId { get; set; }
    public string MetricType { get; set; }
    public decimal Value { get; set; }
    public string Period { get; set; }
    public DateTime RecordedAt { get; set; }
}

public class BusinessCategory
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Description { get; set; }
}

public class Reservation
{
    public int Id { get; set; }
    public int BusinessId { get; set; }
    public string CustomerName { get; set; }
    public string CustomerEmail { get; set; }
    public string CustomerPhone { get; set; }
    public DateTime ReservationDate { get; set; }
    public int PartySize { get; set; }
    public string SpecialRequests { get; set; }
    public string Status { get; set; }
}

public class MusicArtist
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Genre { get; set; }
    public long TotalStreams { get; set; }
    public long MonthlyListeners { get; set; }
    public bool IsVerified { get; set; }
    public string ProfileImage { get; set; }
}

public class User
{
    public int Id { get; set; }
    public string Username { get; set; }
    public string Email { get; set; }
    public string Role { get; set; }
}

// API Response wrapper
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public T Data { get; set; }
    public string ErrorMessage { get; set; }
}

// Main API client class
public class PlanV4ApiClient : IDisposable
{
    private readonly HttpClient httpClient;
    private readonly string baseUrl;

    public PlanV4ApiClient(string baseUrl = "http://localhost:5000")
    {
        this.baseUrl = baseUrl;
        httpClient = new HttpClient
        {
            BaseAddress = new Uri(baseUrl),
            Timeout = TimeSpan.FromSeconds(30)
        };
        httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
    }

    // Generic GET method
    private async Task<T> GetAsync<T>(string endpoint)
    {
        try
        {
            var response = await httpClient.GetAsync(endpoint);
            response.EnsureSuccessStatusCode();
            var jsonString = await response.Content.ReadAsStringAsync();
            return JsonConvert.DeserializeObject<T>(jsonString);
        }
        catch (HttpRequestException ex)
        {
            throw new Exception($"API request failed: {ex.Message}");
        }
        catch (JsonException ex)
        {
            throw new Exception($"Failed to parse API response: {ex.Message}");
        }
    }

    // Generic POST method
    private async Task<T> PostAsync<T>(string endpoint, object data)
    {
        try
        {
            var json = JsonConvert.SerializeObject(data);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await httpClient.PostAsync(endpoint, content);
            response.EnsureSuccessStatusCode();
            var jsonString = await response.Content.ReadAsStringAsync();
            return JsonConvert.DeserializeObject<T>(jsonString);
        }
        catch (HttpRequestException ex)
        {
            throw new Exception($"API request failed: {ex.Message}");
        }
        catch (JsonException ex)
        {
            throw new Exception($"Failed to parse API response: {ex.Message}");
        }
    }

    // Business operations
    public async Task<List<Business>> GetBusinessesAsync()
    {
        return await GetAsync<List<Business>>("/api/businesses");
    }

    public async Task<Business> CreateBusinessAsync(Business business)
    {
        return await PostAsync<Business>("/api/businesses", business);
    }

    // Analytics operations
    public async Task<List<Analytics>> GetAnalyticsByCategoryAsync(string category)
    {
        return await GetAsync<List<Analytics>>($"/api/analytics/{category}");
    }

    public async Task<Analytics> CreateAnalyticsAsync(Analytics analytics)
    {
        return await PostAsync<Analytics>("/api/analytics", analytics);
    }

    // Category operations
    public async Task<List<BusinessCategory>> GetCategoriesAsync()
    {
        return await GetAsync<List<BusinessCategory>>("/api/categories");
    }

    // Reservation operations
    public async Task<List<Reservation>> GetReservationsAsync()
    {
        return await GetAsync<List<Reservation>>("/api/reservations");
    }

    public async Task<Reservation> CreateReservationAsync(Reservation reservation)
    {
        return await PostAsync<Reservation>("/api/reservations", reservation);
    }

    // Music operations
    public async Task<List<MusicArtist>> GetMusicArtistsAsync()
    {
        return await GetAsync<List<MusicArtist>>("/api/music/artists");
    }

    // Authentication (if implemented)
    public async Task<User> SignInAsync(string username, string password)
    {
        var credentials = new { username, password };
        return await PostAsync<User>("/api/auth/signin", credentials);
    }

    // Health check
    public async Task<bool> CheckHealthAsync()
    {
        try
        {
            var response = await httpClient.GetAsync("/health");
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    public void Dispose()
    {
        httpClient?.Dispose();
    }
}

// Service layer for business logic
public class PlanV4Service : IDisposable
{
    private readonly PlanV4ApiClient apiClient;

    public PlanV4Service(string baseUrl = "http://localhost:5000")
    {
        apiClient = new PlanV4ApiClient(baseUrl);
    }

    // Business analytics with error handling
    public async Task<Dictionary<string, decimal>> GetBusinessAnalyticsAsync(string categoryName)
    {
        try
        {
            var analytics = await apiClient.GetAnalyticsByCategoryAsync(categoryName.ToLower());
            var result = new Dictionary<string, decimal>();

            foreach (var item in analytics)
            {
                result[item.MetricType] = item.Value;
            }

            return result;
        }
        catch (Exception ex)
        {
            // Log error and return empty dictionary
            Console.WriteLine($"Error fetching analytics: {ex.Message}");
            return new Dictionary<string, decimal>();
        }
    }

    // Get business summary
    public async Task<Dictionary<string, object>> GetBusinessSummaryAsync()
    {
        try
        {
            var businesses = await apiClient.GetBusinessesAsync();
            var categories = await apiClient.GetCategoriesAsync();

            return new Dictionary<string, object>
            {
                {"TotalBusinesses", businesses.Count},
                {"TotalCategories", categories.Count},
                {"BusinessesByCategory", businesses.GroupBy(b => b.CategoryId).ToDictionary(g => g.Key, g => g.Count())},
                {"LastUpdated", DateTime.Now}
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching business summary: {ex.Message}");
            return new Dictionary<string, object>();
        }
    }

    // Create new business with validation
    public async Task<bool> CreateBusinessWithValidationAsync(string name, int categoryId, string description, string address, string phone, string email, string website)
    {
        try
        {
            // Basic validation
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Business name is required");

            if (categoryId <= 0)
                throw new ArgumentException("Valid category is required");

            var business = new Business
            {
                Name = name,
                CategoryId = categoryId,
                OwnerId = 1, // Default owner
                Description = description,
                Address = address,
                Phone = phone,
                Email = email,
                Website = website
            };

            var result = await apiClient.CreateBusinessAsync(business);
            return result != null && result.Id > 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error creating business: {ex.Message}");
            return false;
        }
    }

    // Get trending music data
    public async Task<List<MusicArtist>> GetTrendingMusicAsync()
    {
        try
        {
            var artists = await apiClient.GetMusicArtistsAsync();
            return artists.OrderByDescending(a => a.TotalStreams).Take(10).ToList();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching trending music: {ex.Message}");
            return new List<MusicArtist>();
        }
    }

    // Book reservation
    public async Task<bool> BookReservationAsync(int businessId, string customerName, string customerEmail, string customerPhone, DateTime reservationDate, int partySize, string specialRequests)
    {
        try
        {
            var reservation = new Reservation
            {
                BusinessId = businessId,
                CustomerName = customerName,
                CustomerEmail = customerEmail,
                CustomerPhone = customerPhone,
                ReservationDate = reservationDate,
                PartySize = partySize,
                SpecialRequests = specialRequests,
                Status = "pending"
            };

            var result = await apiClient.CreateReservationAsync(reservation);
            return result != null && result.Id > 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error booking reservation: {ex.Message}");
            return false;
        }
    }

    // Health check with retry
    public async Task<bool> IsServiceHealthyAsync(int retryCount = 3)
    {
        for (int i = 0; i < retryCount; i++)
        {
            try
            {
                var isHealthy = await apiClient.CheckHealthAsync();
                if (isHealthy) return true;

                if (i < retryCount - 1)
                    await Task.Delay(1000); // Wait 1 second before retry
            }
            catch
            {
                // Continue to next retry
            }
        }

        return false;
    }

    public void Dispose()
    {
        apiClient?.Dispose();
    }
}

// Example Windows Form integration
public partial class PlanV4MainForm : Form
{
    private PlanV4Service planV4Service;
    private Button btnLoadBusinesses;
    private Button btnLoadAnalytics;
    private Button btnCreateBusiness;
    private DataGridView dgvBusinesses;
    private DataGridView dgvAnalytics;
    private ComboBox cmbCategories;
    private Label lblStatus;

    public PlanV4MainForm()
    {
        InitializeComponent();
        planV4Service = new PlanV4Service();
    }

    private void InitializeComponent()
    {
        // Form setup
        this.Text = "Plan V4 Business Intelligence Dashboard";
        this.Size = new System.Drawing.Size(1200, 800);
        this.StartPosition = FormStartPosition.CenterScreen;

        // Status label
        lblStatus = new Label
        {
            Text = "Ready",
            Location = new System.Drawing.Point(10, 10),
            Size = new System.Drawing.Size(200, 20)
        };

        // Buttons
        btnLoadBusinesses = new Button
        {
            Text = "Load Businesses",
            Location = new System.Drawing.Point(10, 40),
            Size = new System.Drawing.Size(120, 30)
        };
        btnLoadBusinesses.Click += BtnLoadBusinesses_Click;

        btnLoadAnalytics = new Button
        {
            Text = "Load Analytics",
            Location = new System.Drawing.Point(140, 40),
            Size = new System.Drawing.Size(120, 30)
        };
        btnLoadAnalytics.Click += BtnLoadAnalytics_Click;

        btnCreateBusiness = new Button
        {
            Text = "Create Business",
            Location = new System.Drawing.Point(270, 40),
            Size = new System.Drawing.Size(120, 30)
        };
        btnCreateBusiness.Click += BtnCreateBusiness_Click;

        // Category combo box
        cmbCategories = new ComboBox
        {
            Location = new System.Drawing.Point(400, 40),
            Size = new System.Drawing.Size(150, 30),
            DropDownStyle = ComboBoxStyle.DropDownList
        };

        // Data grids
        dgvBusinesses = new DataGridView
        {
            Location = new System.Drawing.Point(10, 80),
            Size = new System.Drawing.Size(580, 300),
            AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
            ReadOnly = true
        };

        dgvAnalytics = new DataGridView
        {
            Location = new System.Drawing.Point(600, 80),
            Size = new System.Drawing.Size(580, 300),
            AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
            ReadOnly = true
        };

        // Add controls to form
        this.Controls.AddRange(new Control[] { lblStatus, btnLoadBusinesses, btnLoadAnalytics, btnCreateBusiness, cmbCategories, dgvBusinesses, dgvAnalytics });

        // Load categories on form load
        this.Load += MainForm_Load;
    }

    private async void MainForm_Load(object sender, EventArgs e)
    {
        try
        {
            lblStatus.Text = "Loading categories...";
            var categories = await planV4Service.apiClient.GetCategoriesAsync();

            cmbCategories.DataSource = categories;
            cmbCategories.DisplayMember = "Name";
            cmbCategories.ValueMember = "Name";

            lblStatus.Text = "Ready";
        }
        catch (Exception ex)
        {
            lblStatus.Text = $"Error: {ex.Message}";
            MessageBox.Show($"Failed to load categories: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private async void BtnLoadBusinesses_Click(object sender, EventArgs e)
    {
        try
        {
            lblStatus.Text = "Loading businesses...";
            btnLoadBusinesses.Enabled = false;

            var businesses = await planV4Service.apiClient.GetBusinessesAsync();
            dgvBusinesses.DataSource = businesses;

            lblStatus.Text = $"Loaded {businesses.Count} businesses";
        }
        catch (Exception ex)
        {
            lblStatus.Text = $"Error: {ex.Message}";
            MessageBox.Show($"Failed to load businesses: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        finally
        {
            btnLoadBusinesses.Enabled = true;
        }
    }

    private async void BtnLoadAnalytics_Click(object sender, EventArgs e)
    {
        try
        {
            if (cmbCategories.SelectedValue == null)
            {
                MessageBox.Show("Please select a category first.", "Warning", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            lblStatus.Text = "Loading analytics...";
            btnLoadAnalytics.Enabled = false;

            var category = cmbCategories.SelectedValue.ToString().ToLower();
            var analytics = await planV4Service.apiClient.GetAnalyticsByCategoryAsync(category);
            dgvAnalytics.DataSource = analytics;

            lblStatus.Text = $"Loaded {analytics.Count} analytics records";
        }
        catch (Exception ex)
        {
            lblStatus.Text = $"Error: {ex.Message}";
            MessageBox.Show($"Failed to load analytics: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        finally
        {
            btnLoadAnalytics.Enabled = true;
        }
    }

    private async void BtnCreateBusiness_Click(object sender, EventArgs e)
    {
        // Simple input dialog for demonstration
        var name = Microsoft.VisualBasic.Interaction.InputBox("Enter business name:", "Create Business");
        if (string.IsNullOrWhiteSpace(name)) return;

        try
        {
            lblStatus.Text = "Creating business...";
            btnCreateBusiness.Enabled = false;

            var success = await planV4Service.CreateBusinessWithValidationAsync(
                name, 1, "Sample business", "Sample address", "+33 1 00 00 00 00", "sample@email.com", "https://sample.com");

            if (success)
            {
                lblStatus.Text = "Business created successfully";
                MessageBox.Show("Business created successfully!", "Success", MessageBoxButtons.OK, MessageBoxIcon.Information);
                // Refresh businesses list
                BtnLoadBusinesses_Click(sender, e);
            }
            else
            {
                lblStatus.Text = "Failed to create business";
                MessageBox.Show("Failed to create business.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
        catch (Exception ex)
        {
            lblStatus.Text = $"Error: {ex.Message}";
            MessageBox.Show($"Error creating business: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        finally
        {
            btnCreateBusiness.Enabled = true;
        }
    }

    protected override void OnFormClosed(FormClosedEventArgs e)
    {
        planV4Service?.Dispose();
        base.OnFormClosed(e);
    }
}

// Application entry point
public static class Program
{
    [STAThread]
    public static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new PlanV4MainForm());
    }
}
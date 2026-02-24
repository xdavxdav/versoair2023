' Verso Air ™️ Business Intelligence Platform - Visual Basic Integration
' Complete VB.NET integration code for local development

Imports System.Net.Http
Imports System.Text
Imports Newtonsoft.Json
Imports System.Threading.Tasks

' Data models matching the API schema
Public Class Business
    Public Property Id As Integer
    Public Property Name As String
    Public Property CategoryId As Integer
    Public Property OwnerId As Integer
    Public Property Description As String
    Public Property Address As String
    Public Property Phone As String
    Public Property Email As String
    Public Property Website As String
End Class

Public Class Analytics
    Public Property Id As Integer
    Public Property BusinessId As Integer
    Public Property CategoryId As Integer
    Public Property MetricType As String
    Public Property Value As Decimal
    Public Property Period As String
    Public Property RecordedAt As DateTime
End Class

Public Class BusinessCategory
    Public Property Id As Integer
    Public Property Name As String
    Public Property Description As String
End Class

Public Class Reservation
    Public Property Id As Integer
    Public Property BusinessId As Integer
    Public Property CustomerName As String
    Public Property CustomerEmail As String
    Public Property CustomerPhone As String
    Public Property ReservationDate As DateTime
    Public Property PartySize As Integer
    Public Property SpecialRequests As String
    Public Property Status As String
End Class

Public Class MusicArtist
    Public Property Id As Integer
    Public Property Name As String
    Public Property Genre As String
    Public Property TotalStreams As Long
    Public Property MonthlyListeners As Long
    Public Property IsVerified As Boolean
    Public Property ProfileImage As String
End Class

Public Class User
    Public Property Id As Integer
    Public Property Username As String
    Public Property Email As String
    Public Property Role As String
End Class

' API Response wrapper
Public Class ApiResponse(Of T)
    Public Property Success As Boolean
    Public Property Data As T
    Public Property ErrorMessage As String
End Class

' Main API client class
Public Class PlanV4ApiClient
    Private ReadOnly httpClient As HttpClient
    Private ReadOnly baseUrl As String

    Public Sub New(Optional baseUrl As String = "http://localhost:5000")
        Me.baseUrl = baseUrl
        httpClient = New HttpClient()
        httpClient.BaseAddress = New Uri(baseUrl)
        httpClient.DefaultRequestHeaders.Add("Accept", "application/json")
        httpClient.Timeout = TimeSpan.FromSeconds(30)
    End Sub

    ' Generic GET method
    Private Async Function GetAsync(Of T)(endpoint As String) As Task(Of T)
        Try
            Dim response = Await httpClient.GetAsync(endpoint)
            response.EnsureSuccessStatusCode()
            Dim jsonString = Await response.Content.ReadAsStringAsync()
            Return JsonConvert.DeserializeObject(Of T)(jsonString)
        Catch ex As HttpRequestException
            Throw New Exception($"API request failed: {ex.Message}")
        Catch ex As JsonException
            Throw New Exception($"Failed to parse API response: {ex.Message}")
        End Try
    End Function

    ' Generic POST method
    Private Async Function PostAsync(Of T)(endpoint As String, data As Object) As Task(Of T)
        Try
            Dim json = JsonConvert.SerializeObject(data)
            Dim content = New StringContent(json, Encoding.UTF8, "application/json")
            Dim response = Await httpClient.PostAsync(endpoint, content)
            response.EnsureSuccessStatusCode()
            Dim jsonString = Await response.Content.ReadAsStringAsync()
            Return JsonConvert.DeserializeObject(Of T)(jsonString)
        Catch ex As HttpRequestException
            Throw New Exception($"API request failed: {ex.Message}")
        Catch ex As JsonException
            Throw New Exception($"Failed to parse API response: {ex.Message}")
        End Try
    End Function

    ' Business operations
    Public Async Function GetBusinessesAsync() As Task(Of List(Of Business))
        Return Await GetAsync(Of List(Of Business))("/api/businesses")
    End Function

    Public Async Function CreateBusinessAsync(business As Business) As Task(Of Business)
        Return Await PostAsync(Of Business)("/api/businesses", business)
    End Function

    ' Analytics operations
    Public Async Function GetAnalyticsByCategoryAsync(category As String) As Task(Of List(Of Analytics))
        Return Await GetAsync(Of List(Of Analytics))($"/api/analytics/{category}")
    End Function

    Public Async Function CreateAnalyticsAsync(analytics As Analytics) As Task(Of Analytics)
        Return Await PostAsync(Of Analytics)("/api/analytics", analytics)
    End Function

    ' Category operations
    Public Async Function GetCategoriesAsync() As Task(Of List(Of BusinessCategory))
        Return Await GetAsync(Of List(Of BusinessCategory))("/api/categories")
    End Function

    ' Reservation operations
    Public Async Function GetReservationsAsync() As Task(Of List(Of Reservation))
        Return Await GetAsync(Of List(Of Reservation))("/api/reservations")
    End Function

    Public Async Function CreateReservationAsync(reservation As Reservation) As Task(Of Reservation)
        Return Await PostAsync(Of Reservation)("/api/reservations", reservation)
    End Function

    ' Music operations
    Public Async Function GetMusicArtistsAsync() As Task(Of List(Of MusicArtist))
        Return Await GetAsync(Of List(Of MusicArtist))("/api/music/artists")
    End Function

    ' Authentication (if implemented)
    Public Async Function SignInAsync(username As String, password As String) As Task(Of User)
        Dim credentials = New With {.username = username, .password = password}
        Return Await PostAsync(Of User)("/api/auth/signin", credentials)
    End Function

    ' Health check
    Public Async Function CheckHealthAsync() As Task(Of Boolean)
        Try
            Dim response = Await httpClient.GetAsync("/health")
            Return response.IsSuccessStatusCode
        Catch
            Return False
        End Try
    End Function

    ' Dispose resources
    Protected Overridable Sub Dispose(disposing As Boolean)
        If disposing Then
            httpClient?.Dispose()
        End If
    End Sub

    Public Sub Dispose() Implements IDisposable.Dispose
        Dispose(True)
        GC.SuppressFinalize(Me)
    End Sub
End Class

' Service layer for business logic
Public Class PlanV4Service
    Private ReadOnly apiClient As PlanV4ApiClient

    Public Sub New(Optional baseUrl As String = "http://localhost:5000")
        apiClient = New PlanV4ApiClient(baseUrl)
    End Sub

    ' Business analytics with error handling
    Public Async Function GetBusinessAnalyticsAsync(categoryName As String) As Task(Of Dictionary(Of String, Decimal))
        Try
            Dim analytics = Await apiClient.GetAnalyticsByCategoryAsync(categoryName.ToLower())
            Dim result = New Dictionary(Of String, Decimal)()

            For Each item In analytics
                result(item.MetricType) = item.Value
            Next

            Return result
        Catch ex As Exception
            ' Log error and return empty dictionary
            Console.WriteLine($"Error fetching analytics: {ex.Message}")
            Return New Dictionary(Of String, Decimal)()
        End Try
    End Function

    ' Get business summary
    Public Async Function GetBusinessSummaryAsync() As Task(Of Dictionary(Of String, Object))
        Try
            Dim businesses = Await apiClient.GetBusinessesAsync()
            Dim categories = Await apiClient.GetCategoriesAsync()

            Return New Dictionary(Of String, Object) From {
                {"TotalBusinesses", businesses.Count},
                {"TotalCategories", categories.Count},
                {"BusinessesByCategory", businesses.GroupBy(Function(b) b.CategoryId).ToDictionary(Function(g) g.Key, Function(g) g.Count())},
                {"LastUpdated", DateTime.Now}
            }
        Catch ex As Exception
            Console.WriteLine($"Error fetching business summary: {ex.Message}")
            Return New Dictionary(Of String, Object)()
        End Try
    End Function

    ' Create new business with validation
    Public Async Function CreateBusinessWithValidationAsync(name As String, categoryId As Integer, description As String, address As String, phone As String, email As String, website As String) As Task(Of Boolean)
        Try
            ' Basic validation
            If String.IsNullOrWhiteSpace(name) Then
                Throw New ArgumentException("Business name is required")
            End If

            If categoryId <= 0 Then
                Throw New ArgumentException("Valid category is required")
            End If

            Dim business = New Business With {
                .Name = name,
                .CategoryId = categoryId,
                .OwnerId = 1, ' Default owner
                .Description = description,
                .Address = address,
                .Phone = phone,
                .Email = email,
                .Website = website
            }

            Dim result = Await apiClient.CreateBusinessAsync(business)
            Return result IsNot Nothing AndAlso result.Id > 0
        Catch ex As Exception
            Console.WriteLine($"Error creating business: {ex.Message}")
            Return False
        End Try
    End Function

    ' Get trending music data
    Public Async Function GetTrendingMusicAsync() As Task(Of List(Of MusicArtist))
        Try
            Dim artists = Await apiClient.GetMusicArtistsAsync()
            Return artists.OrderByDescending(Function(a) a.TotalStreams).Take(10).ToList()
        Catch ex As Exception
            Console.WriteLine($"Error fetching trending music: {ex.Message}")
            Return New List(Of MusicArtist)()
        End Try
    End Function

    ' Book reservation
    Public Async Function BookReservationAsync(businessId As Integer, customerName As String, customerEmail As String, customerPhone As String, reservationDate As DateTime, partySize As Integer, specialRequests As String) As Task(Of Boolean)
        Try
            Dim reservation = New Reservation With {
                .BusinessId = businessId,
                .CustomerName = customerName,
                .CustomerEmail = customerEmail,
                .CustomerPhone = customerPhone,
                .ReservationDate = reservationDate,
                .PartySize = partySize,
                .SpecialRequests = specialRequests,
                .Status = "pending"
            }

            Dim result = Await apiClient.CreateReservationAsync(reservation)
            Return result IsNot Nothing AndAlso result.Id > 0
        Catch ex As Exception
            Console.WriteLine($"Error booking reservation: {ex.Message}")
            Return False
        End Try
    End Function

    ' Health check with retry
    Public Async Function IsServiceHealthyAsync(Optional retryCount As Integer = 3) As Task(Of Boolean)
        For i As Integer = 0 To retryCount - 1
            Try
                Dim isHealthy = Await apiClient.CheckHealthAsync()
                If isHealthy Then Return True
                
                If i < retryCount - 1 Then
                    Await Task.Delay(1000) ' Wait 1 second before retry
                End If
            Catch
                ' Continue to next retry
            End Try
        Next

        Return False
    End Function

    Public Sub Dispose()
        apiClient?.Dispose()
    End Sub
End Class

' Example Windows Form integration
Public Class PlanV4MainForm
    Inherits Form

    Private planV4Service As PlanV4Service
    Private WithEvents btnLoadBusinesses As Button
    Private WithEvents btnLoadAnalytics As Button
    Private WithEvents btnCreateBusiness As Button
    Private WithEvents dgvBusinesses As DataGridView
    Private WithEvents dgvAnalytics As DataGridView
    Private WithEvents cmbCategories As ComboBox
    Private WithEvents lblStatus As Label

    Public Sub New()
        InitializeComponent()
        planV4Service = New PlanV4Service()
    End Sub

    Private Sub InitializeComponent()
        ' Form setup
        Me.Text = "Plan V4 Business Intelligence Dashboard"
        Me.Size = New Size(1200, 800)
        Me.StartPosition = FormStartPosition.CenterScreen

        ' Status label
        lblStatus = New Label With {
            .Text = "Ready",
            .Location = New Point(10, 10),
            .Size = New Size(200, 20)
        }

        ' Buttons
        btnLoadBusinesses = New Button With {
            .Text = "Load Businesses",
            .Location = New Point(10, 40),
            .Size = New Size(120, 30)
        }

        btnLoadAnalytics = New Button With {
            .Text = "Load Analytics",
            .Location = New Point(140, 40),
            .Size = New Size(120, 30)
        }

        btnCreateBusiness = New Button With {
            .Text = "Create Business",
            .Location = New Point(270, 40),
            .Size = New Size(120, 30)
        }

        ' Category combo box
        cmbCategories = New ComboBox With {
            .Location = New Point(400, 40),
            .Size = New Size(150, 30),
            .DropDownStyle = ComboBoxStyle.DropDownList
        }

        ' Data grids
        dgvBusinesses = New DataGridView With {
            .Location = New Point(10, 80),
            .Size = New Size(580, 300),
            .AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
            .ReadOnly = True
        }

        dgvAnalytics = New DataGridView With {
            .Location = New Point(600, 80),
            .Size = New Size(580, 300),
            .AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
            .ReadOnly = True
        }

        ' Add controls to form
        Me.Controls.AddRange({lblStatus, btnLoadBusinesses, btnLoadAnalytics, btnCreateBusiness, cmbCategories, dgvBusinesses, dgvAnalytics})

        ' Load categories on form load
        AddHandler Me.Load, AddressOf MainForm_Load
    End Sub

    Private Async Sub MainForm_Load(sender As Object, e As EventArgs)
        Try
            lblStatus.Text = "Loading categories..."
            Dim categories = Await planV4Service.apiClient.GetCategoriesAsync()
            
            cmbCategories.DataSource = categories
            cmbCategories.DisplayMember = "Name"
            cmbCategories.ValueMember = "Name"
            
            lblStatus.Text = "Ready"
        Catch ex As Exception
            lblStatus.Text = $"Error: {ex.Message}"
            MessageBox.Show($"Failed to load categories: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error)
        End Try
    End Sub

    Private Async Sub btnLoadBusinesses_Click(sender As Object, e As EventArgs) Handles btnLoadBusinesses.Click
        Try
            lblStatus.Text = "Loading businesses..."
            btnLoadBusinesses.Enabled = False
            
            Dim businesses = Await planV4Service.apiClient.GetBusinessesAsync()
            dgvBusinesses.DataSource = businesses
            
            lblStatus.Text = $"Loaded {businesses.Count} businesses"
        Catch ex As Exception
            lblStatus.Text = $"Error: {ex.Message}"
            MessageBox.Show($"Failed to load businesses: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error)
        Finally
            btnLoadBusinesses.Enabled = True
        End Try
    End Sub

    Private Async Sub btnLoadAnalytics_Click(sender As Object, e As EventArgs) Handles btnLoadAnalytics.Click
        Try
            If cmbCategories.SelectedValue Is Nothing Then
                MessageBox.Show("Please select a category first.", "Warning", MessageBoxButtons.OK, MessageBoxIcon.Warning)
                Return
            End If

            lblStatus.Text = "Loading analytics..."
            btnLoadAnalytics.Enabled = False
            
            Dim category = cmbCategories.SelectedValue.ToString().ToLower()
            Dim analytics = Await planV4Service.apiClient.GetAnalyticsByCategoryAsync(category)
            dgvAnalytics.DataSource = analytics
            
            lblStatus.Text = $"Loaded {analytics.Count} analytics records"
        Catch ex As Exception
            lblStatus.Text = $"Error: {ex.Message}"
            MessageBox.Show($"Failed to load analytics: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error)
        Finally
            btnLoadAnalytics.Enabled = True
        End Try
    End Sub

    Private Async Sub btnCreateBusiness_Click(sender As Object, e As EventArgs) Handles btnCreateBusiness.Click
        ' Simple input dialog for demonstration
        Dim name = InputBox("Enter business name:", "Create Business")
        If String.IsNullOrWhiteSpace(name) Then Return

        Try
            lblStatus.Text = "Creating business..."
            btnCreateBusiness.Enabled = False
            
            Dim success = Await planV4Service.CreateBusinessWithValidationAsync(
                name, 1, "Sample business", "Sample address", "+33 1 00 00 00 00", "sample@email.com", "https://sample.com")
            
            If success Then
                lblStatus.Text = "Business created successfully"
                MessageBox.Show("Business created successfully!", "Success", MessageBoxButtons.OK, MessageBoxIcon.Information)
                ' Refresh businesses list
                btnLoadBusinesses.PerformClick()
            Else
                lblStatus.Text = "Failed to create business"
                MessageBox.Show("Failed to create business.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error)
            End If
        Catch ex As Exception
            lblStatus.Text = $"Error: {ex.Message}"
            MessageBox.Show($"Error creating business: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error)
        Finally
            btnCreateBusiness.Enabled = True
        End Try
    End Sub

    Protected Overrides Sub OnFormClosed(e As FormClosedEventArgs)
        planV4Service?.Dispose()
        MyBase.OnFormClosed(e)
    End Sub
End Class

' Application entry point
Module Program
    <STAThread>
    Sub Main()
        Application.EnableVisualStyles()
        Application.SetCompatibleTextRenderingDefault(False)
        Application.Run(New PlanV4MainForm())
    End Sub
End Module
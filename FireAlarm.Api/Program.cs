using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MySqlConnector;

var builder = WebApplication.CreateBuilder(args);

// =====================================================
// 1. REGISTER HTTP CLIENT
// =====================================================

builder.Services.AddHttpClient();

var app = builder.Build();

// =====================================================
// 2. ENABLE DASHBOARD STATIC FILES
// =====================================================

app.UseDefaultFiles();
app.UseStaticFiles();

// =====================================================
// 3. HOME PAGE - DASHBOARD
// =====================================================

app.MapGet("/", () =>
{
    return Results.Redirect("/index.html");
});

// =====================================================
// 4. API STATUS
// =====================================================

app.MapGet("/api/status", () =>
{
    return Results.Ok(new
    {
        message = "Fire Alarm API is running!",
        status = "Online"
    });
});

// =====================================================
// 5. RECEIVE SENSOR DATA FROM ESP32
// =====================================================

app.MapPost("/api/sensor/readings", async (
    SensorReadingRequest reading,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration) =>
{
    // Validate sensor values
    if (!float.IsFinite(reading.TemperatureC) ||
        !float.IsFinite(reading.HumidityPercent) ||
        !float.IsFinite(reading.Mq4Voltage) ||
        !float.IsFinite(reading.RsKohm) ||
        !float.IsFinite(reading.Ch4PpmApprox))
    {
        return Results.BadRequest(new
        {
            message = "Invalid sensor values."
        });
    }

    try
    {
        // =============================================
        // 6. PREPARE DATA FOR PYTHON ML API
        // =============================================

        var mlInput = new
        {
            temperature_c = reading.TemperatureC,
            humidity_percent = reading.HumidityPercent,
            mq4_voltage = reading.Mq4Voltage,
            rs_kohm = reading.RsKohm
        };

        // =============================================
        // 7. CALL PYTHON ML API
        // =============================================

        var httpClient = httpClientFactory.CreateClient();

        var mlResponse = await httpClient.PostAsJsonAsync(
            "http://127.0.0.1:5000/predict",
            mlInput
        );

        if (!mlResponse.IsSuccessStatusCode)
        {
            var errorBody =
                await mlResponse.Content.ReadAsStringAsync();

            return Results.Problem(
                detail: $"Python ML API returned an error: {errorBody}",
                statusCode: 502
            );
        }

        using var mlJson =
            await mlResponse.Content.ReadFromJsonAsync<JsonDocument>();

        if (mlJson == null ||
            !mlJson.RootElement.TryGetProperty(
                "prediction",
                out var predictionElement))
        {
            return Results.Problem(
                detail: "Prediction was missing from Python ML API response.",
                statusCode: 502
            );
        }

        string prediction =
            predictionElement.GetString() ?? "Unknown";

        // =============================================
        // 8. GET MYSQL CONNECTION STRING
        // =============================================

        string? connectionString =
            configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return Results.Problem(
                detail: "MySQL connection string is missing.",
                statusCode: 500
            );
        }

        // =============================================
        // 9. CONNECT TO MYSQL DATABASE
        // =============================================

        await using var connection =
            new MySqlConnection(connectionString);

        await connection.OpenAsync();

        // =============================================
        // 10. INSERT SENSOR DATA INTO MYSQL
        // =============================================

        const string sql = @"
            INSERT INTO sensor_readings
            (
                temperature_c,
                humidity_percent,
                mq4_voltage,
                rs_kohm,
                ch4_ppm_approx,
                prediction
            )
            VALUES
            (
                @temperature,
                @humidity,
                @voltage,
                @resistance,
                @ch4,
                @prediction
            );";

        await using var command =
            new MySqlCommand(sql, connection);

        command.Parameters.AddWithValue(
            "@temperature",
            reading.TemperatureC
        );

        command.Parameters.AddWithValue(
            "@humidity",
            reading.HumidityPercent
        );

        command.Parameters.AddWithValue(
            "@voltage",
            reading.Mq4Voltage
        );

        command.Parameters.AddWithValue(
            "@resistance",
            reading.RsKohm
        );

        command.Parameters.AddWithValue(
            "@ch4",
            reading.Ch4PpmApprox
        );

        command.Parameters.AddWithValue(
            "@prediction",
            prediction
        );

        await command.ExecuteNonQueryAsync();

        // =============================================
        // 11. RETURN SUCCESS RESPONSE
        // =============================================

        return Results.Ok(new
        {
            message = "Sensor readings and ML prediction saved successfully!",

            temperature_c = reading.TemperatureC,
            humidity_percent = reading.HumidityPercent,
            mq4_voltage = reading.Mq4Voltage,
            rs_kohm = reading.RsKohm,
            ch4_ppm_approx = reading.Ch4PpmApprox,

            prediction = prediction,

            ml_details = mlJson.RootElement.Clone()
        });
    }
    catch (HttpRequestException ex)
    {
        return Results.Problem(
            detail: $"Could not connect to Python ML API: {ex.Message}",
            statusCode: 502
        );
    }
    catch (MySqlException ex)
    {
        return Results.Problem(
            detail: $"MySQL database error: {ex.Message}",
            statusCode: 500
        );
    }
    catch (Exception ex)
    {
        return Results.Problem(
            detail: ex.Message,
            statusCode: 500
        );
    }
});

// =====================================================
// 12. GET LATEST SENSOR READING
// =====================================================

app.MapGet("/api/sensor/latest", async (
    IConfiguration configuration) =>
{
    try
    {
        string? connectionString =
            configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return Results.Problem(
                detail: "MySQL connection string is missing.",
                statusCode: 500
            );
        }

        await using var connection =
            new MySqlConnection(connectionString);

        await connection.OpenAsync();

        const string sql = @"
            SELECT
                id,
                temperature_c,
                humidity_percent,
                mq4_voltage,
                rs_kohm,
                ch4_ppm_approx,
                prediction,
                created_at
            FROM sensor_readings
            ORDER BY id DESC
            LIMIT 1;";

        await using var command =
            new MySqlCommand(sql, connection);

        await using var reader =
            await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return Results.Ok(new
            {
                message = "No sensor readings available yet."
            });
        }

        return Results.Ok(new
        {
            id = reader.GetInt32("id"),
            temperature_c = reader.GetDouble("temperature_c"),
            humidity_percent = reader.GetDouble("humidity_percent"),
            mq4_voltage = reader.GetDouble("mq4_voltage"),
            rs_kohm = reader.GetDouble("rs_kohm"),
            ch4_ppm_approx = reader.GetDouble("ch4_ppm_approx"),
            prediction = reader.GetString("prediction"),
            created_at = reader.GetDateTime("created_at")
        });
    }
    catch (Exception ex)
    {
        return Results.Problem(
            detail: ex.Message,
            statusCode: 500
        );
    }
});

// =====================================================
// 13. GET SENSOR HISTORY FOR DASHBOARD CHARTS
// =====================================================

app.MapGet("/api/sensor/history", async (
    IConfiguration configuration,
    int? limit) =>
{
    try
    {
        string? connectionString =
            configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return Results.Problem(
                detail: "MySQL connection string is missing.",
                statusCode: 500
            );
        }

        int recordLimit = Math.Clamp(limit ?? 50, 1, 200);

        await using var connection =
            new MySqlConnection(connectionString);

        await connection.OpenAsync();

        const string sql = @"
            SELECT
                id,
                temperature_c,
                humidity_percent,
                mq4_voltage,
                rs_kohm,
                ch4_ppm_approx,
                prediction,
                created_at
            FROM sensor_readings
            ORDER BY id DESC
            LIMIT @limit;";

        await using var command =
            new MySqlCommand(sql, connection);

        command.Parameters.AddWithValue("@limit", recordLimit);

        var records = new List<object>();

        await using var reader =
            await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            records.Add(new
            {
                id = reader.GetInt32("id"),
                temperature_c = reader.GetDouble("temperature_c"),
                humidity_percent = reader.GetDouble("humidity_percent"),
                mq4_voltage = reader.GetDouble("mq4_voltage"),
                rs_kohm = reader.GetDouble("rs_kohm"),
                ch4_ppm_approx = reader.GetDouble("ch4_ppm_approx"),
                prediction = reader.GetString("prediction"),
                created_at = reader.GetDateTime("created_at")
            });
        }

        return Results.Ok(records);
    }
    catch (Exception ex)
    {
        return Results.Problem(
            detail: ex.Message,
            statusCode: 500
        );
    }
});

// =====================================================
// 14. START ASP.NET CORE SERVER
// =====================================================

app.Run();

// =====================================================
// 15. ESP32 JSON REQUEST MODEL
// =====================================================

public sealed class SensorReadingRequest
{
    [JsonPropertyName("temperatureC")]
    public float TemperatureC { get; set; }

    [JsonPropertyName("humidityPercent")]
    public float HumidityPercent { get; set; }

    [JsonPropertyName("mq4Voltage")]
    public float Mq4Voltage { get; set; }

    [JsonPropertyName("rsKohm")]
    public float RsKohm { get; set; }

    [JsonPropertyName("ch4PpmApprox")]
    public float Ch4PpmApprox { get; set; }
}

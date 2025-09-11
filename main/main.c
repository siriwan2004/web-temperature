#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_system.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_log.h"
#include "driver/gpio.h"
#include "esp_http_client.h"
#include <stdio.h>
#include <string.h>
#include "dht.h"
#include "nvs_flash.h"
#include "freertos/event_groups.h"

#define WIFI_SSID "Rapee"
#define WIFI_PASS "123456789"
#define DHTPIN 4
#define POST_INTERVAL_MS 10000
#define HTTP_RETRY_MS 5000

static const char *TAG = "WEB_TEMP";
static EventGroupHandle_t s_wifi_event_group;
#define WIFI_CONNECTED_BIT BIT0

// ----- Wi-Fi event handler -----
static void wifi_event_handler(void* arg, esp_event_base_t event_base,
                               int32_t event_id, void* event_data) {
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {
        esp_wifi_connect();
    } else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
        esp_wifi_connect();
        ESP_LOGI(TAG, "Retrying WiFi connection...");
    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        xEventGroupSetBits(s_wifi_event_group, WIFI_CONNECTED_BIT);
        ESP_LOGI(TAG, "WiFi connected!");
    }
}

// ----- Wi-Fi connect -----
void wifi_init_sta(void) {
    ESP_ERROR_CHECK(nvs_flash_init());
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    s_wifi_event_group = xEventGroupCreate();

    ESP_ERROR_CHECK(esp_event_handler_instance_register(WIFI_EVENT,
                                                        ESP_EVENT_ANY_ID,
                                                        &wifi_event_handler,
                                                        NULL,
                                                        NULL));
    ESP_ERROR_CHECK(esp_event_handler_instance_register(IP_EVENT,
                                                        IP_EVENT_STA_GOT_IP,
                                                        &wifi_event_handler,
                                                        NULL,
                                                        NULL));

    wifi_config_t wifi_config = {};
    strcpy((char*)wifi_config.sta.ssid, WIFI_SSID);
    strcpy((char*)wifi_config.sta.password, WIFI_PASS);
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());

    ESP_LOGI(TAG, "Waiting for WiFi connection...");
    xEventGroupWaitBits(s_wifi_event_group, WIFI_CONNECTED_BIT, pdFALSE, pdTRUE, portMAX_DELAY);
}

// ----- DHT read -----
esp_err_t read_dht(float *temperature, float *humidity) {
    int ret = dht_read_float_data(DHT_TYPE_DHT11, DHTPIN, temperature, humidity);
    if (ret == ESP_OK) {
        ESP_LOGI(TAG, "DHT11 -> T=%.1f°C  H=%.1f%%", *temperature, *humidity);
    } else {
        ESP_LOGW(TAG, "Failed to read DHT (error %d)", ret);
    }
    return ret;
}

// ----- HTTP POST -----
void post_telemetry(float t, float h) {
    char post_data[128];
    snprintf(post_data, sizeof(post_data), "{\"temperature\":%.1f,\"humidity\":%.1f}", t, h);

    esp_http_client_config_t config = {
        .url = "http://172.20.10.2:3000/temperature",
        .method = HTTP_METHOD_POST,
        .timeout_ms = 10000, // เพิ่ม timeout 10 วินาที
    };

    esp_http_client_handle_t client = esp_http_client_init(&config);
    esp_http_client_set_header(client, "Content-Type", "application/json");
    esp_http_client_set_post_field(client, post_data, strlen(post_data));

    esp_err_t err;
    int retry_count = 0;
    do {
        err = esp_http_client_perform(client);
        if (err == ESP_OK) {
            ESP_LOGI(TAG, "HTTP POST Status = %d, content_length = %d",
                     esp_http_client_get_status_code(client),
                     esp_http_client_get_content_length(client));
            break;
        } else {
            ESP_LOGE(TAG, "HTTP POST failed: %s, retrying in %d ms", esp_err_to_name(err), HTTP_RETRY_MS);
            vTaskDelay(pdMS_TO_TICKS(HTTP_RETRY_MS));
            retry_count++;
        }
    } while (retry_count < 3);

    esp_http_client_cleanup(client);
}

// ----- Main task -----
void temperature_task(void *pvParameter) {
    float t, h;
    while (1) {
        if (read_dht(&t, &h) == ESP_OK) {
            post_telemetry(t, h);
        }
        vTaskDelay(pdMS_TO_TICKS(POST_INTERVAL_MS));
    }
}

// ----- App main -----
void app_main(void) {
    wifi_init_sta(); // รอ Wi-Fi connect ก่อน
    xTaskCreate(&temperature_task, "temperature_task", 4096, NULL, 5, NULL);
}

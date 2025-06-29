# Lightboard HTTP to MQTT Bridge Server (v2)

This Go application acts as a bridge, receiving HTTP POST requests with JSON payloads and translating them into MQTT messages. It publishes different aspects of the data (intensity, color, on/off state) to distinct MQTT topics based on a configurable mapping per channel number.

## Features

- Receives JSON data via HTTP POST to the `/post` endpoint.
- Expects `channelNumber` (integer) in the JSON payload to identify channels.
- Publishes intensity, color, and on/off state to separate, configurable MQTT topics for each channel. **Note:** Messages are only sent if the respective value (intensity, color, or on/off state) has changed since the last update for that channel.
- Configurable MQTT broker and HTTP listener settings (including port).
- Incoming data points within a single HTTP request are processed asynchronously.
- Displays the current state of processed channels (intensity, color, on/off) to standard output, with colors translated for terminal display (using ANSI TrueColor).
- All other diagnostic and error logging is directed to standard error.
- Graceful shutdown.
- Docker support for containerized deployment.

## Standard Output Display

When channel data is processed, the server prints the current state of each channel to standard output. This provides a live view of the lightboard's state as understood by the server.

Format:
`CH <ChannelNo> | Intensity: <Value> | Color: <ColorBlock> <HexColorString> | State: <On/Off>`

Example:
`CH  42 | Intensity: 127.50 | Color: ██ #7F3F00 | State: On`
(The `██` represents a small block displayed in the actual color specified by the hex code, using ANSI TrueColor escape sequences in capable terminals.)

## Configuration

The server is configured using a YAML file (e.g., `config.yaml`). The path to this file must be provided using the `-config` command-line flag. A `config.sample.yaml` is provided as a template.

### Configuration Options:

- `mqttBroker` (string, required): The address of the MQTT broker (e.g., `tcp://localhost:1883`).
- `httpListenAddr` (string, optional): The address and port for the HTTP server to listen on (e.g., `:8080`, `localhost:8090`). Defaults to `:8080`.
- `channelMappings` (array, required): A list of mappings. Each mapping links a `channelNumber` to its specific MQTT topics.
    - `channelNumber` (int, required): The identifier for the channel, as provided in the HTTP JSON.
    - `intensityTopic` (string, required): MQTT topic for publishing the channel's intensity/value.
    - `colorTopic` (string, required): MQTT topic for publishing the channel's color.
    - `onOffTopic` (string, required): MQTT topic for publishing the channel's on/off state (1 for on, 0 for off).
- `mqttClientId` (string, optional): Client ID for MQTT connection. Defaults to `lightboard-http-bridge-v2`.
- `mqttUsername` (string, optional): Username for MQTT broker authentication.
- `mqttPassword` (string, optional): Password for MQTT broker authentication.

### Sample `config.yaml`:

```yaml
mqttBroker: "tcp://mqtt.example.com:1883"
httpListenAddr: ":8090" # Server will listen on port 8090 on all available network interfaces

channelMappings:
  - channelNumber: 1
    intensityTopic: "lightboard/channel/1/intensity"
    colorTopic: "lightboard/channel/1/color"
    onOffTopic: "lightboard/channel/1/onoff"
  - channelNumber: 2
    intensityTopic: "lightboard/channel/2/intensity"
    colorTopic: "lightboard/channel/2/color"
    onOffTopic: "lightboard/channel/2/onoff"
  - channelNumber: 101
    intensityTopic: "venue/stage/light/101/brightness"
    colorTopic: "venue/stage/light/101/rgb_color"
    onOffTopic: "venue/stage/light/101/status"

mqttClientId: "my-lightboard-controller"
mqttUsername: "bridge_user"
mqttPassword: "secure_password"
```

## HTTP API

- **Endpoint:** `/post`
- **Method:** `POST`
- **Request Body:** JSON array of data points. Each data point object should have:
    ```json
    [
      {
        "channelNumber": 1,     // Integer identifying the channel
        "value": 75.5,          // Numeric value for intensity
        "color": "#FF0000"      // Hex color string
      },
      {
        "channelNumber": 2,
        "value": 0,
        "color": "#00FF00"
      }
      // ... more data points
    ]
    ```

- **Response:**
    - `200 OK`: If all data points were valid and MQTT publish attempts were initiated. Body: `Successfully processed X data points.`
    - `207 Multi-Status`: If there were errors processing some data points (e.g., missing channel mapping, invalid value) or errors during MQTT publishing attempts. The response body will contain a list of errors.
    - `400 Bad Request`: If the JSON payload is malformed, contains invalid value types (e.g., non-numeric string for `value` that cannot be parsed by `json.Number`), or if the data array is empty.
    - `405 Method Not Allowed`: If a method other than POST is used.

- **Health Check Endpoint**:
    - **Endpoint**: `/health`
    - **Method**: `GET`
    - **Response**: `200 OK` with body "OK".

## MQTT Message Behavior

For each valid data point received via HTTP, the server determines if the intensity, color, or on/off state has changed compared to the last known state for that channel. It then publishes MQTT messages *only for those aspects that have changed*.

1.  **Intensity:** (Sent if changed)
    -   **Topic:** Defined by `intensityTopic` in the channel's mapping.
    -   **Payload:** The `value` from the JSON, formatted as a string (e.g., `"75.500000"`).
2.  **Color:** (Sent if changed)
    -   **Topic:** Defined by `colorTopic`.
    -   **Payload:** The `color` string from the JSON (e.g., `"#FF0000"`).
3.  **On/Off State:** (Sent if changed)
    -   **Topic:** Defined by `onOffTopic`.
    -   **Payload:** `"1"` if the `value > 0`, otherwise `"0"`.

If a channel is seen for the first time, all three aspects are considered "changed" and will be published.

1.  **Intensity:**
    -   **Topic:** Defined by `intensityTopic` in the channel's mapping.
    -   **Payload:** The `value` from the JSON, formatted as a string (e.g., `"75.500000"`).
2.  **Color:**
    -   **Topic:** Defined by `colorTopic`.
    -   **Payload:** The `color` string from the JSON (e.g., `"#FF0000"`).
3.  **On/Off State:**
    -   **Topic:** Defined by `onOffTopic`.
    -   **Payload:** `"1"` if the `value > 0`, otherwise `"0"`.

## Building and Running

### Prerequisites

- Go (version 1.21 or later recommended)
- An MQTT broker

### From Source

1.  Navigate to the `server` directory.
2.  Build: `go build -o lightboard-server .`
3.  Prepare `config.yaml`.
4.  Run: `./lightboard-server -config /path/to/your/config.yaml`

### Using Docker

1.  Build image (from `server` directory): `docker build -t lightboard-server-bridge .`
2.  Run container:
    ```bash
    docker run -d \
      -p <host_port>:<container_port_from_config> \
      -v /path/to/your/host/config.yaml:/app/config.yaml \
      --name lightboard-bridge \
      lightboard-server-bridge -config /app/config.yaml
    ```
    Ensure `<host_port>` and `<container_port_from_config>` match your `httpListenAddr` setting.

## Development

- Dependencies: Go Modules, `github.com/eclipse/paho.mqtt.golang`, `gopkg.in/yaml.v3`.
```

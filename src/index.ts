
import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";

function createServer() {
  const server = new McpServer({
    name: "open-meteo-weather",
    version: "1.0.0",
  });

  server.registerTool(
    "get_hcm_weather",
    {
      description:
        "Get real 7-day weather forecast for Ho Chi Minh City from Open-Meteo API.",
      inputSchema: {
        forecast_days: z.number().int().min(1).max(16).optional()
          .describe("Number of forecast days, default is 7"),
      },
    },
    async ({ forecast_days }) => {
      try {
        const days = forecast_days ?? 7;

        const url = new URL(
          "https://api.open-meteo.com/v1/forecast"
        );

        url.search = new URLSearchParams({
          latitude: "10.8231",
          longitude: "106.6297",
          daily:
            "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
          timezone: "Asia/Bangkok",
          forecast_days: String(days),
        }).toString();

        const response = await fetch(url.toString());

        if (!response.ok) {
          throw new Error(`Open-Meteo HTTP ${response.status}`);
        }

        const data: any = await response.json();

        const rows = data.daily.time.map(
          (date: string, i: number) => ({
            date,
            location: "Ho Chi Minh City",
            max_temperature:
              data.daily.temperature_2m_max[i],
            min_temperature:
              data.daily.temperature_2m_min[i],
            rain_probability:
              data.daily.precipitation_probability_max[i],
          })
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  source: "Open-Meteo",
                  timezone: data.timezone,
                  forecast: rows,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Weather API error: ${String(error)}`,
            },
          ],
        };
      }
    }
  );

  return server;
}

const handler = createMcpHandler(createServer);

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return handler(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;

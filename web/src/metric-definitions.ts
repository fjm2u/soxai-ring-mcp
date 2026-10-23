// Numeric metric definitions from SOXAI official OpenAPI, checked 2026-10-23.
// Values are not converted. Unknown names retain null units and descriptions.
export const definitionSource = "https://web-api.soxai.site/openapi.json";
export const definitions: Record<"daily" | "intraday", Record<string, { unit: string | null; description: string }>> = {
  "daily": {
    "activity_score": {
      "unit": "pt",
      "description": "Activity Score: Index of physical activity"
    },
    "activity_ree_calories": {
      "unit": "kcal",
      "description": "Activity - Basal Metabolic Calories: Minimum energy expenditure required to sustain life"
    },
    "activity_calories": {
      "unit": "kcal",
      "description": "Activity - Calories Burned: Calories burned through activity"
    },
    "activity_steps": {
      "unit": "step",
      "description": "Activity - Steps: Number of steps in a day"
    },
    "activity_mets": {
      "unit": "METs",
      "description": "Activity - METs: Physical activity intensity for the day, in multiples of the resting metabolic rate"
    },
    "health_score": {
      "unit": "pt",
      "description": "Health Score: Overall index of physical health, ranging from 0 to 100"
    },
    "health_hr_day_mean": {
      "unit": "bpm",
      "description": "Health - Average Daytime Heart Rate: Average daytime heart rate over a day"
    },
    "health_hr_day_max": {
      "unit": "bpm",
      "description": "Health - Maximum Daytime Heart Rate: Maximum daytime heart rate over a day"
    },
    "health_hr_day_min": {
      "unit": "bpm",
      "description": "Health - Minimum Daytime Heart Rate: Minimum daytime heart rate over a day"
    },
    "health_hrv_day_mean": {
      "unit": "ms",
      "description": "Health - Average Daytime Heart Rate Variability: Daily average heart rate variability (RMSSD)"
    },
    "health_hrv_day_max": {
      "unit": "ms",
      "description": "Health - Maximum Daytime Heart Rate Variability: Daily maximum heart rate variability (RMSSD)"
    },
    "health_hrv_day_min": {
      "unit": "ms",
      "description": "Health - Minimum Daytime Heart Rate Variability: Daily minimum heart rate variability (RMSSD)"
    },
    "health_spo2": {
      "unit": "%",
      "description": "Health - Average Blood Oxygen Saturation: Daily average blood oxygen saturation"
    },
    "health_spo2_max": {
      "unit": "%",
      "description": "Health - Maximum Blood Oxygen Saturation: Daily maximum blood oxygen saturation"
    },
    "health_spo2_min": {
      "unit": "%",
      "description": "Health - Minimum Blood Oxygen Saturation: Daily minimum blood oxygen saturation"
    },
    "health_stress": {
      "unit": "pt",
      "description": "Health - Average Stress Level: Daily average stress level"
    },
    "health_stress_max": {
      "unit": "pt",
      "description": "Health - Maximum Stress Level: Daily maximum stress level"
    },
    "health_stress_min": {
      "unit": "pt",
      "description": "Health - Minimum Stress Level: Daily minimum stress level"
    },
    "health_temperature": {
      "unit": "°C",
      "description": "Health - Average Skin Temperature: Daily average skin temperature"
    },
    "health_temperature_max": {
      "unit": "°C",
      "description": "Health - Maximum Skin Temperature: Daily maximum skin temperature"
    },
    "health_temperature_min": {
      "unit": "°C",
      "description": "Health - Minimum Skin Temperature: Daily minimum skin temperature"
    },
    "health_bodytemperature": {
      "unit": "°C",
      "description": "Health - Body Temperature: Always null. Body temperature is not yet stored in the database"
    },
    "health_bodytemperature_max": {
      "unit": "°C",
      "description": "Health - Body Temperature Max: Always null. Body temperature is not yet stored in the database"
    },
    "health_bodytemperature_min": {
      "unit": "°C",
      "description": "Health - Body Temperature Min: Always null. Body temperature is not yet stored in the database"
    },
    "sleep_score": {
      "unit": "pt",
      "description": "Sleep Score: Overall index of sleep quality"
    },
    "sleep_time_in_bed": {
      "unit": "mins",
      "description": "Sleep - Total Sleep Time Including Latency: Total sleep duration including sleep latency"
    },
    "sleep_total_sleep_time": {
      "unit": "mins",
      "description": "Sleep - Sleep Time Excluding Awake Time: Sleep duration excluding time spent awake"
    },
    "sleep_awake_time": {
      "unit": "mins",
      "description": "Sleep - Awake Time Including Latency: Awake time including sleep latency"
    },
    "sleep_rem_sleep_time": {
      "unit": "mins",
      "description": "Sleep - REM Sleep Time: Total time spent in the REM sleep stage"
    },
    "sleep_light_sleep_time": {
      "unit": "mins",
      "description": "Sleep - Light Sleep Time: Total time spent in the light sleep stage"
    },
    "sleep_deep_sleep_time": {
      "unit": "mins",
      "description": "Sleep - Deep Sleep Time: Total time spent in the deep sleep stage"
    },
    "sleep_nap_time": {
      "unit": "mins",
      "description": "Sleep - Nap Time: Total duration of daytime sleep episodes lasting at least 15 consecutive minutes"
    },
    "sleep_latency": {
      "unit": "mins",
      "description": "Sleep - Sleep Latency: Time taken to fall asleep"
    },
    "sleep_efficiency": {
      "unit": "%",
      "description": "Sleep - Sleep Efficiency Including Latency: Sleep efficiency including sleep latency"
    },
    "sleep_hr_mean": {
      "unit": "bpm",
      "description": "Sleep - Average Heart Rate: Average heart rate during sleep"
    },
    "sleep_hr_min": {
      "unit": "bpm",
      "description": "Sleep - Minimum Heart Rate: Minimum heart rate during sleep"
    },
    "sleep_hr_max": {
      "unit": "bpm",
      "description": "Sleep - Heart Rate Max: Highest sleep_hr_mean among the detail epochs inside the sleep period. Filled only when the daily series carries no value"
    },
    "sleep_hrv_mean": {
      "unit": "ms",
      "description": "Sleep - Average Heart Rate Variability: Average heart rate variability during sleep"
    },
    "sleep_hrv_min": {
      "unit": "ms",
      "description": "Sleep - Heart Rate Variability Min: Lowest sleep_hrv_mean among the detail epochs inside the sleep period. Filled only when the daily series carries no value"
    },
    "sleep_hrv_max": {
      "unit": "ms",
      "description": "Sleep - Heart Rate Variability Max: Highest sleep_hrv_mean among the detail epochs inside the sleep period. Filled only when the daily series carries no value"
    },
    "sleep_spo2_mean": {
      "unit": "%",
      "description": "Sleep - Average Blood Oxygen Saturation: Average blood oxygen saturation during sleep"
    },
    "sleep_spo2_min": {
      "unit": "%",
      "description": "Sleep - Minimum Blood Oxygen Saturation: Minimum blood oxygen saturation during sleep"
    },
    "sleep_spo2_max": {
      "unit": "%",
      "description": "Sleep - Maximum Blood Oxygen Saturation: Maximum blood oxygen saturation during sleep"
    },
    "sleep_debt": {
      "unit": "mins",
      "description": "Sleep - Sleep Debt: Accumulated sleep debt"
    },
    "sleep_ahi_class": {
      "unit": "index",
      "description": "Sleep - Maximum AHI: Maximum apnea-hypopnea index"
    },
    "sleep_respiration_rate_mean": {
      "unit": "breath/min",
      "description": "Sleep - Average Respiratory Rate: Average respiratory rate during sleep"
    }
  },
  "intraday": {
    "activity_zcm": {
      "unit": null,
      "description": "Activity - Zero Crossing Count: Raw zc field. Unit and value details are not documented in the schema list"
    },
    "activity_pim": {
      "unit": null,
      "description": "Activity - Activity Amount: Raw acti field. Unit and value details are not documented in the schema list"
    },
    "activity_jerk": {
      "unit": null,
      "description": "Activity - Jerk: Listed as an output column, but nothing in the repository writes it, so it does not appear in the response"
    },
    "activity_mets": {
      "unit": "METs",
      "description": "Activity - METs: Physical activity intensity in multiples of the resting metabolic rate"
    },
    "activity_sleep_awake": {
      "unit": null,
      "description": "Activity - Sleep or Awake: Raw sleep_f field. Unit and value details are not documented in the schema list"
    },
    "activity_calorie": {
      "unit": "kcal",
      "description": "Activity - Calories Burned: Calories burned"
    },
    "activity_steps": {
      "unit": "count",
      "description": "Activity - Steps: Number of steps"
    },
    "activity_confirm": {
      "unit": "flag",
      "description": "Activity - Confirmation Flag: Data confirmation flag (1: confirmed, 0: unconfirmed)"
    },
    "activity_type": {
      "unit": "category",
      "description": "Activity - Type: Activity type (0: resting, 1: walking, 2: running, 3: other, 9: unknown)"
    },
    "activity_strength": {
      "unit": "ratio",
      "description": "Activity - Intensity: Index of activity intensity"
    },
    "activity_act_mlc": {
      "unit": "category",
      "description": "Activity - Edge Processing Data: Edge processing data (act_mlc)"
    },
    "health_T": {
      "unit": "°C",
      "description": "Health - Skin Temperature: Skin temperature"
    },
    "health_cbt": {
      "unit": "°C",
      "description": "Health - Core Body Temperature: Always null. Core body temperature is not yet stored in the database"
    },
    "health_hr": {
      "unit": "bpm",
      "description": "Health - Heart Rate: Average heart rate"
    },
    "health_hrv": {
      "unit": "ms",
      "description": "Health - Heart Rate Variability: Heart rate variability (RMSSD)"
    },
    "health_lf": {
      "unit": null,
      "description": "Health - LF: Raw LF field, the low frequency component of heart rate variability. Unit and value details are not documented in the schema list"
    },
    "health_hf": {
      "unit": null,
      "description": "Health - HF: health_lf divided by the raw lf_hf ratio; null where lf_hf is 0. Unit and value details are not documented in the schema list"
    },
    "health_spo2": {
      "unit": "%",
      "description": "Health - Blood Oxygen Saturation: Blood oxygen saturation"
    },
    "health_stress": {
      "unit": "pt",
      "description": "Health - Stress Level: Stress level"
    },
    "health_hr_dB": {
      "unit": null,
      "description": "Health - Heart Rate Signal Level: Raw HR_dB field. Unit and value details are not documented in the schema list"
    },
    "sleep_hr": {
      "unit": "bpm",
      "description": "Sleep - Heart Rate: Heart rate during sleep"
    },
    "sleep_hrv": {
      "unit": "ms",
      "description": "Sleep - Heart Rate Variability: Heart rate variability during sleep (RMSSD)"
    },
    "sleep_spo2": {
      "unit": "%",
      "description": "Sleep - SpO2: health_spo2 restricted to epochs that are asleep and not awake; null on every other row"
    },
    "sleep_stage": {
      "unit": "category",
      "description": "Sleep - Stage (4 Categories): Sleep stage (0: deep sleep, 1: light sleep, 2: REM, 3: awake or undetermined)"
    },
    "sleep_stage_1min": {
      "unit": "category",
      "description": "Sleep - 1-Minute Stage (4 Categories): Sleep stage for each minute, one digit per minute joined into an integer (0: deep sleep, 1: light sleep, 2: REM, 3: awake or undetermined)"
    },
    "sleep_odi": {
      "unit": "index",
      "description": "Sleep - ODI: 3% oxygen desaturation index (ODI)"
    },
    "sleep_respiration": {
      "unit": "breath/min",
      "description": "Sleep - Respiratory Rate: Respiratory rate"
    }
  }
};

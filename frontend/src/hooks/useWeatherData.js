/**
 * useWeatherData.js — Wrapper hook (Backward Compatible)
 *
 * Hook này giữ nguyên API cũ { data, loading, error, dates, provinces }
 * nhưng bên trong gọi WeatherDataContext thay vì fetch trực tiếp Supabase.
 *
 * Lợi ích:
 *  - 4 tab (Overview, TimeTrend, ProvinceComparison, Relationship) KHÔNG cần sửa gì
 *  - Data được share từ Context → không fetch lại mỗi lần chuyển tab
 */
import { useWeatherContext } from '../contexts/WeatherDataContext';

export default function useWeatherData() {
  return useWeatherContext();
}

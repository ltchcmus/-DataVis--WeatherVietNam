/**
 * Danh sách 6 vùng kinh tế - xã hội của Việt Nam theo yêu cầu:
 * 1. Vùng trung du và miền núi phía Bắc
 * 2. Vùng đồng bằng sông Hồng
 * 3. Vùng Bắc Trung Bộ
 * 4. Vùng duyên hải Nam Trung Bộ và Tây Nguyên
 * 5. Vùng Đông Nam Bộ
 * 6. Vùng đồng bằng sông Cửu Long
 */

export const REGIONS = [
  'Vùng trung du và miền núi phía Bắc',
  'Vùng đồng bằng sông Hồng',
  'Vùng Bắc Trung Bộ',
  'Vùng duyên hải Nam Trung Bộ và Tây Nguyên',
  'Vùng Đông Nam Bộ',
  'Vùng đồng bằng sông Cửu Long',
];

export const PROVINCE_TO_REGION = {
  // 1. Vùng trung du và miền núi phía Bắc
  'Hà Giang': 'Vùng trung du và miền núi phía Bắc',
  'Cao Bằng': 'Vùng trung du và miền núi phía Bắc',
  'Bắc Kạn': 'Vùng trung du và miền núi phía Bắc',
  'Lạng Sơn': 'Vùng trung du và miền núi phía Bắc',
  'Tuyên Quang': 'Vùng trung du và miền núi phía Bắc',
  'Thái Nguyên': 'Vùng trung du và miền núi phía Bắc',
  'Phú Thọ': 'Vùng trung du và miền núi phía Bắc',
  'Bắc Giang': 'Vùng trung du và miền núi phía Bắc',
  'Quảng Ninh': 'Vùng trung du và miền núi phía Bắc',
  'Lào Cai': 'Vùng trung du và miền núi phía Bắc',
  'Yên Bái': 'Vùng trung du và miền núi phía Bắc',
  'Điện Biên': 'Vùng trung du và miền núi phía Bắc',
  'Hòa Bình': 'Vùng trung du và miền núi phía Bắc',
  'Lai Châu': 'Vùng trung du và miền núi phía Bắc',
  'Sơn La': 'Vùng trung du và miền núi phía Bắc',

  // 2. Vùng đồng bằng sông Hồng
  'Hà Nội': 'Vùng đồng bằng sông Hồng',
  'Hải Phòng': 'Vùng đồng bằng sông Hồng',
  'Bắc Ninh': 'Vùng đồng bằng sông Hồng',
  'Hà Nam': 'Vùng đồng bằng sông Hồng',
  'Hải Dương': 'Vùng đồng bằng sông Hồng',
  'Hưng Yên': 'Vùng đồng bằng sông Hồng',
  'Nam Định': 'Vùng đồng bằng sông Hồng',
  'Ninh Bình': 'Vùng đồng bằng sông Hồng',
  'Thái Bình': 'Vùng đồng bằng sông Hồng',
  'Vĩnh Phúc': 'Vùng đồng bằng sông Hồng',

  // 3. Vùng Bắc Trung Bộ
  'Thanh Hóa': 'Vùng Bắc Trung Bộ',
  'Nghệ An': 'Vùng Bắc Trung Bộ',
  'Hà Tĩnh': 'Vùng Bắc Trung Bộ',
  'Quảng Bình': 'Vùng Bắc Trung Bộ',
  'Quảng Trị': 'Vùng Bắc Trung Bộ',
  'Thừa Thiên Huế': 'Vùng Bắc Trung Bộ',
  'Thừa Thiên - Huế': 'Vùng Bắc Trung Bộ',

  // 4. Vùng duyên hải Nam Trung Bộ và Tây Nguyên
  'Đà Nẵng': 'Vùng duyên hải Nam Trung Bộ và Tây Nguyên',
  'Quảng Nam': 'Vùng duyên hải Nam Trung Bộ và Tây Nguyên',
  'Quảng Ngãi': 'Vùng duyên hải Nam Trung Bộ và Tây Nguyên',
  'Bình Định': 'Vùng duyên hải Nam Trung Bộ và Tây Nguyên',
  'Phú Yên': 'Vùng duyên hải Nam Trung Bộ và Tây Nguyên',
  'Khánh Hòa': 'Vùng duyên hải Nam Trung Bộ và Tây Nguyên',
  'Ninh Thuận': 'Vùng duyên hải Nam Trung Bộ và Tây Nguyên',
  'Bình Thuận': 'Vùng duyên hải Nam Trung Bộ và Tây Nguyên',
  'Kon Tum': 'Vùng duyên hải Nam Trung Bộ và Tây Nguyên',
  'Gia Lai': 'Vùng duyên hải Nam Trung Bộ và Tây Nguyên',
  'Đắc Lắc': 'Vùng duyên hải Nam Trung Bộ và Tây Nguyên',
  'Đắk Lắk': 'Vùng duyên hải Nam Trung Bộ và Tây Nguyên',
  'Đắk Nông': 'Vùng duyên hải Nam Trung Bộ và Tây Nguyên',
  'Lâm Đồng': 'Vùng duyên hải Nam Trung Bộ và Tây Nguyên',

  // 5. Vùng Đông Nam Bộ
  'TP. Hồ Chí Minh': 'Vùng Đông Nam Bộ',
  'TP.HCM': 'Vùng Đông Nam Bộ',
  'Hồ Chí Minh': 'Vùng Đông Nam Bộ',
  'Bà Rịa - Vũng Tàu': 'Vùng Đông Nam Bộ',
  'Bà Rịa-Vũng Tàu': 'Vùng Đông Nam Bộ',
  'Bình Dương': 'Vùng Đông Nam Bộ',
  'Bình Phước': 'Vùng Đông Nam Bộ',
  'Đồng Nai': 'Vùng Đông Nam Bộ',
  'Tây Ninh': 'Vùng Đông Nam Bộ',

  // 6. Vùng đồng bằng sông Cửu Long
  'Cần Thơ': 'Vùng đồng bằng sông Cửu Long',
  'An Giang': 'Vùng đồng bằng sông Cửu Long',
  'Bạc Liêu': 'Vùng đồng bằng sông Cửu Long',
  'Bến Tre': 'Vùng đồng bằng sông Cửu Long',
  'Cà Mau': 'Vùng đồng bằng sông Cửu Long',
  'Đồng Tháp': 'Vùng đồng bằng sông Cửu Long',
  'Hậu Giang': 'Vùng đồng bằng sông Cửu Long',
  'Kiên Giang': 'Vùng đồng bằng sông Cửu Long',
  'Long An': 'Vùng đồng bằng sông Cửu Long',
  'Sóc Trăng': 'Vùng đồng bằng sông Cửu Long',
  'Tiền Giang': 'Vùng đồng bằng sông Cửu Long',
  'Trà Vinh': 'Vùng đồng bằng sông Cửu Long',
  'Vĩnh Long': 'Vùng đồng bằng sông Cửu Long',
};

export function getRegionByProvince(provinceName) {
  if (!provinceName) return 'Khác';
  const name = String(provinceName).trim();
  return PROVINCE_TO_REGION[name] || 'Khác';
}

export const MASTER_BUSINESS_INFO = {
  businessName: '스포키듀',
  representativeName: '최지훈',
  customerServicePhone: '010-4437-9294',
  customerServiceEmail: 'spokedu77@gmail.com',
  mailOrderStatus: '신고 완료',
  businessRegistrationNumber: '311-63-00356',
  businessAddress: '서울특별시 강동구 성내동 430-2, 7층 1호',
} as const;

export const MASTER_CUSTOMER_SERVICE_TEL_HREF = 'tel:01044379294';
export const MASTER_CUSTOMER_SERVICE_HREF = `mailto:${MASTER_BUSINESS_INFO.customerServiceEmail}`;
export const MASTER_CENTER_INQUIRY_HREF = `mailto:${MASTER_BUSINESS_INFO.customerServiceEmail}?subject=SPOKEDU%20MASTER%20Center%20%EB%8F%84%EC%9E%85%20%EC%83%81%EB%8B%B4`;
export const SPOMAT_BULK_INQUIRY_HREF = `mailto:${MASTER_BUSINESS_INFO.customerServiceEmail}?subject=SPOMAT%20%EB%8C%80%EB%9F%89%20%EA%B5%AC%EB%A7%A4%20%EB%AC%B8%EC%9D%98`;

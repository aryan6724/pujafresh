export type CustomerAddressLabel = "Home" | "Work" | "Other";

export type CustomerAddress = {
  id: string;
  customerEmail?: string;
  customerPhone?: string;
  label: CustomerAddressLabel;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string;
};

export const CUSTOMER_ADDRESSES_STORAGE_KEY = "pujafresh-customer-addresses";

const normalizeEmail = (email?: string) => {
  return email?.trim().toLowerCase() || "";
};

const normalizePhone = (phone?: string) => {
  return phone?.replace(/\D/g, "") || "";
};

export const createAddressId = () => {
  return `ADDR-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
};

export function getAllCustomerAddresses() {
  if (typeof window === "undefined") return [];

  const savedAddresses = localStorage.getItem(CUSTOMER_ADDRESSES_STORAGE_KEY);

  if (!savedAddresses) return [];

  try {
    const parsedAddresses = JSON.parse(savedAddresses) as CustomerAddress[];

    if (Array.isArray(parsedAddresses)) return parsedAddresses;

    return [];
  } catch {
    return [];
  }
}

export function saveAllCustomerAddresses(addresses: CustomerAddress[]) {
  localStorage.setItem(CUSTOMER_ADDRESSES_STORAGE_KEY, JSON.stringify(addresses));
}

export function getCustomerAddresses(customerEmail?: string, customerPhone?: string) {
  const email = normalizeEmail(customerEmail);
  const phone = normalizePhone(customerPhone);

  return getAllCustomerAddresses()
    .filter((address) => {
      const addressEmail = normalizeEmail(address.customerEmail);
      const addressPhone = normalizePhone(address.customerPhone);

      if (email && addressEmail && email === addressEmail) return true;
      if (phone && addressPhone && phone === addressPhone) return true;

      return false;
    })
    .sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;

      return (
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime()
      );
    });
}

export function getDefaultCustomerAddress(
  customerEmail?: string,
  customerPhone?: string
) {
  const addresses = getCustomerAddresses(customerEmail, customerPhone);

  return addresses.find((address) => address.isDefault) || addresses[0] || null;
}

export function addCustomerAddress(
  address: Omit<CustomerAddress, "id" | "createdAt" | "updatedAt">
) {
  const allAddresses = getAllCustomerAddresses();
  const email = normalizeEmail(address.customerEmail);
  const phone = normalizePhone(address.customerPhone);
  const now = new Date().toISOString();

  const shouldSetDefault =
    address.isDefault || getCustomerAddresses(email, phone).length === 0;

  const updatedAddresses = allAddresses.map((savedAddress) => {
    const savedEmail = normalizeEmail(savedAddress.customerEmail);
    const savedPhone = normalizePhone(savedAddress.customerPhone);

    const belongsToSameCustomer =
      (email && savedEmail && email === savedEmail) ||
      (phone && savedPhone && phone === savedPhone);

    return shouldSetDefault && belongsToSameCustomer
      ? {
          ...savedAddress,
          isDefault: false,
        }
      : savedAddress;
  });

  const newAddress: CustomerAddress = {
    ...address,
    id: createAddressId(),
    customerEmail: email || address.customerEmail,
    customerPhone: normalizePhone(address.customerPhone),
    isDefault: shouldSetDefault,
    createdAt: now,
    updatedAt: now,
  };

  saveAllCustomerAddresses([newAddress, ...updatedAddresses]);

  return newAddress;
}

export function updateCustomerAddress(
  addressId: string,
  updatedAddress: Omit<CustomerAddress, "id" | "createdAt" | "updatedAt">
) {
  const allAddresses = getAllCustomerAddresses();
  const email = normalizeEmail(updatedAddress.customerEmail);
  const phone = normalizePhone(updatedAddress.customerPhone);
  const now = new Date().toISOString();

  const existingAddress = allAddresses.find((address) => address.id === addressId);

  if (!existingAddress) return null;

  const shouldSetDefault = updatedAddress.isDefault;

  const nextAddresses = allAddresses.map((address) => {
    const addressEmail = normalizeEmail(address.customerEmail);
    const addressPhone = normalizePhone(address.customerPhone);

    const belongsToSameCustomer =
      (email && addressEmail && email === addressEmail) ||
      (phone && addressPhone && phone === addressPhone);

    if (address.id === addressId) {
      return {
        ...address,
        ...updatedAddress,
        customerEmail: email || updatedAddress.customerEmail,
        customerPhone: normalizePhone(updatedAddress.customerPhone),
        isDefault: shouldSetDefault,
        updatedAt: now,
      };
    }

    if (shouldSetDefault && belongsToSameCustomer) {
      return {
        ...address,
        isDefault: false,
      };
    }

    return address;
  });

  saveAllCustomerAddresses(nextAddresses);

  return nextAddresses.find((address) => address.id === addressId) || null;
}

export function deleteCustomerAddress(addressId: string) {
  const allAddresses = getAllCustomerAddresses();
  const addressToDelete = allAddresses.find((address) => address.id === addressId);

  if (!addressToDelete) return;

  const updatedAddresses = allAddresses.filter((address) => address.id !== addressId);

  if (addressToDelete.isDefault) {
    const email = normalizeEmail(addressToDelete.customerEmail);
    const phone = normalizePhone(addressToDelete.customerPhone);

    const firstCustomerAddressIndex = updatedAddresses.findIndex((address) => {
      const addressEmail = normalizeEmail(address.customerEmail);
      const addressPhone = normalizePhone(address.customerPhone);

      if (email && addressEmail && email === addressEmail) return true;
      if (phone && addressPhone && phone === addressPhone) return true;

      return false;
    });

    if (firstCustomerAddressIndex >= 0) {
      updatedAddresses[firstCustomerAddressIndex] = {
        ...updatedAddresses[firstCustomerAddressIndex],
        isDefault: true,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  saveAllCustomerAddresses(updatedAddresses);
}

export function setDefaultCustomerAddress(
  addressId: string,
  customerEmail?: string,
  customerPhone?: string
) {
  const email = normalizeEmail(customerEmail);
  const phone = normalizePhone(customerPhone);

  const updatedAddresses = getAllCustomerAddresses().map((address) => {
    const addressEmail = normalizeEmail(address.customerEmail);
    const addressPhone = normalizePhone(address.customerPhone);

    const belongsToSameCustomer =
      (email && addressEmail && email === addressEmail) ||
      (phone && addressPhone && phone === addressPhone);

    if (!belongsToSameCustomer) return address;

    return {
      ...address,
      isDefault: address.id === addressId,
      updatedAt:
        address.id === addressId ? new Date().toISOString() : address.updatedAt,
    };
  });

  saveAllCustomerAddresses(updatedAddresses);
}

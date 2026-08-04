import { useState } from 'react';
import { MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { validateAddressDetails } from '@/utils/validation';
import { formatCurrency, meetsThreshold, toNumber } from '@/utils/settingsHelpers';

interface AddressDetails {
  plotNumber: string;
  buildingName: string;
  street: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  addressType: 'home' | 'work' | 'other';
  saveAs: string;
}

interface SavedAddress {
  id: string;
  name: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
  type: string;
  is_default: boolean;
}

interface CheckoutAddressDetailsProps {
  addressDetails: AddressDetails;
  setAddressDetails: (details: AddressDetails) => void;
  savedAddresses: SavedAddress[];
  selectedAddress: SavedAddress | null;
  setSelectedAddress: (address: SavedAddress | null) => void;
  useExistingAddress: boolean;
  setUseExistingAddress: (use: boolean) => void;
  showAddressForm: boolean;
  setShowAddressForm: (show: boolean) => void;
  settings: any;
  subtotal: number;
  currentUser: any;
  onNext: () => void;
  onPrev: () => void;
  estimatedDeliveryFee: number | null;
  setEstimatedDeliveryFee: (fee: number | null) => void;
  estimatedDeliveryTime: string | null;
  setEstimatedDeliveryTime: (time: string | null) => void;
  cartItems: any[];
  isPincodeServiceable: boolean;
  setIsPincodeServiceable: (serviceable: boolean) => void;
}

const CheckoutAddressDetails = ({
  addressDetails,
  setAddressDetails,
  savedAddresses,
  selectedAddress,
  setSelectedAddress,
  useExistingAddress,
  setUseExistingAddress,
  showAddressForm,
  setShowAddressForm,
  settings,
  subtotal,
  currentUser,
  onNext,
  onPrev
}: CheckoutAddressDetailsProps) => {
  const [addressErrors, setAddressErrors] = useState<string[]>([]);

  const handleSavedAddressSelect = (address: SavedAddress) => {
    setSelectedAddress(address);
    setUseExistingAddress(true);

    // Pre-fill address details from saved address
    setAddressDetails({
      plotNumber: address.address_line_1.split(',')[0] || '',
      buildingName: '',
      street: address.address_line_2 || '',
      landmark: address.landmark || '',
      city: address.city || '',
      state: address.state || '',
      pincode: address.pincode,
      addressType: address.type as 'home' | 'work' | 'other',
      saveAs: address.type === 'other' ? address.name : ''
    });
  };

  const handleNext = () => {
    // Validate city, state, and pincode first
    if (!addressDetails.city || !addressDetails.state || !addressDetails.pincode) {
      setAddressErrors(['Please complete all address fields.']);
      return;
    }

    if (!useExistingAddress) {
      const validation = validateAddressDetails(addressDetails);
      if (!validation.isValid) {
        setAddressErrors(validation.errors);
        return;
      }
    }
    setAddressErrors([]);
    onNext();
  };

  return (
    <Card className="border-brand-gray-200 bg-brand-offwhite shadow-sm">
      <CardHeader className="border-b border-brand-gray-200">
        <CardTitle className="flex items-center text-lg text-brand-black uppercase font-orange-avenue font-normal tracking-wide">
          <MapPin className="h-5 w-5 mr-2 text-brand-black" />
          Complete Address Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">

        {/* Delivery Information */}
        <div className="bg-brand-cream border border-brand-gray-200 rounded-sm p-4">
          <div className="flex items-start space-x-3">
            <Clock className="h-5 w-5 text-brand-black mt-0.5" />
            <div>
              <h4 className="font-medium text-brand-black text-sm">
                Nationwide Delivery
              </h4>
              <p className="text-brand-gray-700 text-sm mt-1">
                We deliver your crownveil pieces across the country within 3–5 business days.
                {!meetsThreshold(subtotal, settings.free_delivery_threshold) && (
                  <span className="block mt-1 font-medium text-brand-black">
                    Add {formatCurrency(toNumber(settings.free_delivery_threshold) - subtotal, settings.currency_symbol)} more for FREE delivery!
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Saved Addresses Section */}
        {savedAddresses.length > 0 && !useExistingAddress && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-brand-black">Use Saved Address</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddressForm(true)}
                className="border-brand-black text-brand-black hover:bg-brand-black hover:text-white"
              >
                Add New Address
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {savedAddresses.map((address) => (
                <div
                  key={address.id}
                  className={`p-4 border rounded-sm cursor-pointer transition-all ${selectedAddress?.id === address.id
                    ? 'border-brand-black bg-brand-cream'
                    : 'border-brand-gray-200 hover:border-brand-black/50'
                    }`}
                  onClick={() => handleSavedAddressSelect(address)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-sm text-brand-black">{address.name}</span>
                        <span className="text-xs bg-brand-gray-200/30 text-brand-gray-700 px-2 py-1 rounded-sm uppercase tracking-wide">
                          {address.type}
                        </span>
                        {address.is_default && (
                          <span className="text-xs bg-brand-black text-white px-2 py-1 rounded-sm uppercase tracking-wide">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-brand-gray-700">
                        {address.address_line_1}
                        {address.address_line_2 && `, ${address.address_line_2}`}
                      </p>
                      <p className="text-sm text-brand-gray-700">
                        {address.city}, {address.state} - {address.pincode}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => setShowAddressForm(true)}
                className="text-brand-black hover:text-brand-charcoal hover:bg-brand-offwhite"
              >
                + Add New Address Instead
              </Button>
            </div>
          </div>
        )}

        {/* Show address form if no saved addresses or user wants to add new */}
        {(savedAddresses.length === 0 || showAddressForm || useExistingAddress) && (
          <>
            {useExistingAddress && (
              <div className="flex items-center justify-between p-3 bg-brand-success-light border border-brand-success-light rounded-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <span className="text-sm font-medium text-brand-black">
                    Using saved address: {selectedAddress?.name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUseExistingAddress(false);
                    setSelectedAddress(null);
                    setShowAddressForm(true);
                  }}
                  className="text-green-700 hover:text-green-800 hover:bg-brand-success-light"
                >
                  Change
                </Button>
              </div>
            )}

            {/* Current Address Display */}
            <div className="bg-brand-offwhite border border-brand-gray-200 rounded-sm p-4">
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-brand-blue mt-0.5" />
                <div>
                  <h4 className="font-medium text-brand-blue text-sm">
                    Delivery Address
                  </h4>
                  <p className="text-brand-blue text-sm mt-1">
                    {addressDetails.city && addressDetails.state && addressDetails.pincode
                      ? `${addressDetails.city}, ${addressDetails.state} - ${addressDetails.pincode}`
                      : 'Please fill in your city, state, and pincode below'
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plotNumber" className="text-sm font-medium text-brand-black">
                  Plot/House Number *
                </Label>
                <Input
                  id="plotNumber"
                  type="text"
                  placeholder="e.g., 123, A-45"
                  value={addressDetails.plotNumber}
                  onChange={(e) => setAddressDetails({ ...addressDetails, plotNumber: e.target.value })}
                  className="h-12 border-brand-gray-200 focus:ring-brand-black bg-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="buildingName" className="text-sm font-medium text-brand-black">
                  Building/Society Name
                </Label>
                <Input
                  id="buildingName"
                  type="text"
                  placeholder="e.g., Green Valley Apartments"
                  value={addressDetails.buildingName}
                  onChange={(e) => setAddressDetails({ ...addressDetails, buildingName: e.target.value })}
                  className="h-12 border-brand-gray-200 focus:ring-brand-black bg-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="street" className="text-sm font-medium text-brand-black">
                Street/Area *
              </Label>
              <Input
                id="street"
                type="text"
                placeholder="e.g., MG Road, Sector 15"
                value={addressDetails.street}
                onChange={(e) => setAddressDetails({ ...addressDetails, street: e.target.value })}
                className="h-12 border-brand-gray-200 focus:ring-brand-black bg-white"
                required
              />
            </div>

            {/* City, State, and Pincode */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium text-brand-black">
                  City *
                </Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="Enter your city"
                  value={addressDetails.city}
                  onChange={(e) => setAddressDetails({ ...addressDetails, city: e.target.value })}
                  className="h-12 border-brand-gray-200 focus:ring-brand-black bg-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state" className="text-sm font-medium text-brand-black">
                  State *
                </Label>
                <Input
                  id="state"
                  type="text"
                  placeholder="Enter your state"
                  value={addressDetails.state}
                  onChange={(e) => setAddressDetails({ ...addressDetails, state: e.target.value })}
                  className="h-12 border-brand-gray-200 focus:ring-brand-black bg-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pincode" className="text-sm font-medium text-brand-black">
                  Pincode *
                </Label>
                <Input
                  id="pincode"
                  type="text"
                  placeholder="Enter 6-digit pincode"
                  value={addressDetails.pincode}
                  onChange={(e) => setAddressDetails({ ...addressDetails, pincode: e.target.value })}
                  className="h-12 border-brand-gray-200 focus:ring-brand-black bg-white"
                  maxLength={6}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="landmark" className="text-sm font-medium text-brand-black">
                Nearby Landmark
              </Label>
              <Input
                id="landmark"
                type="text"
                placeholder="e.g., Near Metro Station"
                value={addressDetails.landmark}
                onChange={(e) => setAddressDetails({ ...addressDetails, landmark: e.target.value })}
                className="h-12 border-brand-gray-200 focus:ring-brand-black bg-white"
              />
            </div>

            {/* Address saving options - only show for authenticated users */}
            {currentUser && (
              <div className="space-y-3">
                <Label className="text-xs font-medium text-brand-black">Save this address as</Label>
                <RadioGroup
                  value={addressDetails.addressType}
                  onValueChange={(value: 'home' | 'work' | 'other') =>
                    setAddressDetails({ ...addressDetails, addressType: value })
                  }
                  className="flex space-x-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="home" id="home" className="text-brand-black" />
                    <Label htmlFor="home" className="cursor-pointer text-brand-gray-700">Home</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="work" id="work" className="text-brand-black" />
                    <Label htmlFor="work" className="cursor-pointer text-brand-gray-700">Work</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="other" className="text-brand-black" />
                    <Label htmlFor="other" className="cursor-pointer text-brand-gray-700">Other</Label>
                  </div>
                </RadioGroup>

                {addressDetails.addressType === 'other' && (
                  <Input
                    placeholder="Enter custom name (e.g., Friend's Place)"
                    value={addressDetails.saveAs}
                    onChange={(e) => setAddressDetails({ ...addressDetails, saveAs: e.target.value })}
                    className="h-12 mt-2 border-brand-gray-200 focus:ring-brand-black"
                  />
                )}
              </div>
            )}

            {/* Save Address Option - only show for authenticated users */}
            {currentUser && !useExistingAddress && (
              <div className="flex items-center space-x-2 p-4 bg-brand-offwhite border border-brand-gray-200 rounded-sm">
                <input
                  type="checkbox"
                  id="saveAddress"
                  checked={true}
                  readOnly
                  className="rounded text-brand-blue focus:ring-brand-blue"
                />
                <Label htmlFor="saveAddress" className="text-sm text-brand-blue">
                  Save this address to your profile for future orders
                  {savedAddresses.length >= 3 && (
                    <span className="block text-xs text-orange-600 mt-1">
                      ⚠️ You have reached the maximum limit of 3 saved addresses
                    </span>
                  )}
                </Label>
              </div>
            )}
          </>
        )}

        {addressErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-sm text-sm">
            {addressErrors.map((error, i) => (
              <p key={i}>{error}</p>
            ))}
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onPrev} size="lg" className="px-8 border-brand-gray-200 text-brand-gray-700 hover:bg-brand-offwhite">
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={
              useExistingAddress
                ? !selectedAddress || !addressDetails.city || !addressDetails.state || !addressDetails.pincode
                : !addressDetails.plotNumber || !addressDetails.street || !addressDetails.city || !addressDetails.state || !addressDetails.pincode
            }
            size="lg"
            className="px-8 bg-brand-black hover:bg-brand-charcoal text-white text-sm"
          >
            Continue to Payment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CheckoutAddressDetails;

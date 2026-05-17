import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Text, TextInput, Button, IconButton, ActivityIndicator, Portal, Modal as PaperModal, SegmentedButtons } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';

import useAuthStore from '../store/useAuthStore';
import useSettingsStore from '../store/useSettingsStore';
import { getTheme } from '../utils/themeColors';
import { t } from '../utils/i18n';
import ProcessingOverlay from '../components/ProcessingOverlay';

const { width, height } = Dimensions.get('window');

const SignupScreen = () => {
  const navigation = useNavigation();
  const signup = useAuthStore(state => state.signup);
  const { theme, language } = useSettingsStore();
  const colors = getTheme(theme);
  
  const [role, setRole] = useState('customer');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    city: '',
    latitude: 33.6844, // Default Islamabad
    longitude: 73.0479
  });
  
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  
  // Field-specific validation errors
  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    general: ''
  });

  // Auto-hide validation errors after 4 seconds
  useEffect(() => {
    const hasErrors = Object.values(errors).some(err => err !== '');
    if (hasErrors) {
      const timer = setTimeout(() => {
        setErrors({
          fullName: '',
          email: '',
          password: '',
          phone: '',
          address: '',
          general: ''
        });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [errors]);

  const formatPhone = (text) => {
    let cleaned = text.replace(/\D/g, '');
    if (cleaned.startsWith('92')) cleaned = cleaned.substring(2);
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    
    let formatted = cleaned;
    if (cleaned.length > 0) {
      formatted = '+92 ' + cleaned.substring(0, 3);
      if (cleaned.length > 3) {
        formatted += '-' + cleaned.substring(3, 10);
      }
    }
    return formatted;
  };

  // Launch map and center on current coordinates
  const handleOpenMap = async () => {
    setDetecting(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrors(prev => ({ ...prev, address: 'Location permission denied' }));
        setMapVisible(true);
        return;
      }

      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setFormData(prev => ({
        ...prev,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      }));
      setMapVisible(true);
    } catch (err) {
      // Clean fallback: still open map on defaults
      setMapVisible(true);
    } finally {
      setDetecting(false);
    }
  };

  // One-tap Pin My Current Location
  const handleGpsPin = async () => {
    setGpsLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert("GPS Permission denied. Centering on default coordinates.");
        setGpsLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      
      // Update local form coordinates
      setFormData(prev => ({
        ...prev,
        ...coords
      }));
      
    } catch (err) {
      alert("GPS Signal weak. Please drop a pin manually on the map.");
    } finally {
      setGpsLoading(false);
    }
  };

  // Geocode and fill fields
  const handleConfirmLocation = async (coords) => {
    setDetecting(true);
    try {
      let reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        const parts = [];
        if (addr.name || addr.houseNumber) parts.push(addr.name || addr.houseNumber);
        if (addr.street) parts.push(addr.street);
        if (addr.district || addr.subregion) parts.push(addr.district || addr.subregion);
        if (addr.city) parts.push(addr.city);
        parts.push(addr.country || 'Pakistan');
        
        const fullAddress = parts.join(', ');
        
        setFormData(prev => ({ 
          ...prev, 
          address: fullAddress,
          city: addr.city || 'Islamabad',
          latitude: coords.latitude,
          longitude: coords.longitude
        }));
      }
      setMapVisible(false);
    } catch (err) {
      setErrors(prev => ({ ...prev, address: 'Could not resolve address for this location.' }));
    } finally {
      setDetecting(false);
    }
  };

  const handleSignup = async () => {
    // Reset validations
    const newErrors = {
      fullName: '',
      email: '',
      password: '',
      phone: '',
      address: '',
      general: ''
    };
    
    let hasValidationError = false;

    // 1. FullName validation (Only alphabets, spaces, dots, hyphens, and quotes, 3 to 50 characters)
    const nameRegex = /^[A-Za-z\s.'-]{3,50}$/;
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
      hasValidationError = true;
    } else if (!nameRegex.test(formData.fullName)) {
      newErrors.fullName = 'Name must only contain letters, spaces, dots, hyphens, or quotes (3 to 50 chars)';
      hasValidationError = true;
    }

    // 2. Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email is required';
      hasValidationError = true;
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email structure';
      hasValidationError = true;
    }

    // 3. Phone validation
    if (!formData.phone || formData.phone.length < 10) {
      newErrors.phone = 'Valid phone number is required';
      hasValidationError = true;
    }

    // 4. Address validation
    if (!formData.address) {
      newErrors.address = 'Please pick a location from the map';
      hasValidationError = true;
    }

    // 5. Password validation (At least 8 chars, 1 letter, 1 number, 1 special char)
    const passRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&.])[A-Za-z\d@$!%*#?&.]{8,}$/;
    if (!formData.password) {
      newErrors.password = 'Password is required';
      hasValidationError = true;
    } else if (!passRegex.test(formData.password)) {
      newErrors.password = 'Password must be 8+ chars with at least one letter, one number, and one special character (@$!%*#?&.)';
      hasValidationError = true;
    }

    if (hasValidationError) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    // Call Firebase Auth & sync with NGINX proxy backend
    const result = await signup({ ...formData, role });
    setLoading(false);
    
    if (result.success) {
      if (result.role === 'provider') {
        navigation.replace('ProviderHome');
      } else {
        navigation.replace('MainTabs');
      }
    } else {
      setErrors(prev => ({ 
        ...prev, 
        general: result.message || 'Signup failed. Email may already be in use.' 
      }));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animatable.View animation="fadeInDown" style={styles.header}>
           <IconButton icon="arrow-left" onPress={() => navigation.goBack()} iconColor={colors.text} />
           <Text style={[styles.title, { color: colors.text }]}>{t('signup_title', language)}</Text>
           <Text style={[styles.subtitle, { color: colors.subtext }]}>{t('signup_subtitle', language)}</Text>
        </Animatable.View>

        {errors.general ? (
          <Animatable.View animation="shake" style={styles.errorBanner}>
            <Text style={styles.errorText}>{errors.general}</Text>
          </Animatable.View>
        ) : null}

        <Animatable.View animation="fadeInUp" delay={200} style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
          
          {/* Custom Role Selector segmented buttons */}
          <View style={styles.fieldWrapper}>
            <Text style={[styles.roleLabel, { color: colors.text }]}>Select Role</Text>
            <SegmentedButtons
              value={role}
              onValueChange={setRole}
              buttons={[
                {
                  value: 'customer',
                  label: 'Customer',
                  icon: 'account',
                  style: {
                    borderTopLeftRadius: 16,
                    borderBottomLeftRadius: 16,
                    backgroundColor: role === 'customer' ? colors.primary + '20' : 'transparent',
                  }
                },
                {
                  value: 'provider',
                  label: 'Service Provider',
                  icon: 'briefcase',
                  style: {
                    borderTopRightRadius: 16,
                    borderBottomRightRadius: 16,
                    backgroundColor: role === 'provider' ? colors.primary + '20' : 'transparent',
                  }
                },
              ]}
              style={styles.segmentedButtons}
              theme={{ colors: { primary: colors.primary } }}
            />
          </View>

          {/* Full Name */}
          <View style={styles.fieldWrapper}>
            <TextInput
              label={t('full_name', language)}
              value={formData.fullName}
              onChangeText={(text) => setFormData({...formData, fullName: text})}
              mode="outlined"
              style={[styles.input, { borderRadius: 16 }]}
              outlineColor={errors.fullName ? '#EF4444' : colors.border}
              activeOutlineColor={errors.fullName ? '#EF4444' : colors.primary}
              textColor={colors.text}
              left={<TextInput.Icon icon="account-outline" color={colors.subtext} />}
            />
            {errors.fullName ? <Text style={styles.inlineError}>{errors.fullName}</Text> : null}
          </View>

          {/* Email */}
          <View style={styles.fieldWrapper}>
            <TextInput
              label={t('email_placeholder', language)}
              value={formData.email}
              onChangeText={(text) => setFormData({...formData, email: text})}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              outlineColor={errors.email ? '#EF4444' : colors.border}
              activeOutlineColor={errors.email ? '#EF4444' : colors.primary}
              textColor={colors.text}
              left={<TextInput.Icon icon="email-outline" color={colors.subtext} />}
            />
            {errors.email ? <Text style={styles.inlineError}>{errors.email}</Text> : null}
          </View>

          {/* Phone */}
          <View style={styles.fieldWrapper}>
            <TextInput
              label={t('phone_number', language)}
              value={formData.phone}
              onChangeText={(text) => setFormData({...formData, phone: formatPhone(text)})}
              mode="outlined"
              placeholder="+92 3XX-XXXXXXX"
              keyboardType="phone-pad"
              style={styles.input}
              outlineColor={errors.phone ? '#EF4444' : colors.border}
              activeOutlineColor={errors.phone ? '#EF4444' : colors.primary}
              textColor={colors.text}
              left={<TextInput.Icon icon="phone-outline" color={colors.subtext} />}
            />
            {errors.phone ? <Text style={styles.inlineError}>{errors.phone}</Text> : null}
          </View>

          {/* Location Picker Section */}
          <View style={[styles.locationContainer, { borderColor: errors.address ? '#EF4444' : colors.border }]}>
             <View style={styles.locationHeader}>
                <Text style={[styles.locationLabel, { color: colors.text }]}>{t('address', language)}</Text>
                <TouchableOpacity style={styles.pickButton} onPress={handleOpenMap} disabled={detecting}>
                   {detecting ? (
                     <ActivityIndicator size={16} color={colors.primary} />
                   ) : (
                     <>
                       <IconButton icon="map-marker-radius" size={18} iconColor={colors.primary} style={{ margin: 0 }} />
                       <Text style={[styles.pickText, { color: colors.primary }]}>{t('pick_location', language)}</Text>
                     </>
                   )}
                </TouchableOpacity>
             </View>
             
             {/* Strictly non-editable address text input */}
             <TextInput
               label={detecting ? t('fetching_location', language) : t('address', language)}
               value={formData.address}
               mode="outlined"
               multiline
               editable={false}
               style={styles.addressInput}
               outlineColor="transparent"
               activeOutlineColor="transparent"
               textColor={colors.text}
               left={<TextInput.Icon icon="map-outline" color={colors.subtext} />}
             />
             {errors.address ? <Text style={styles.inlineError}>{errors.address}</Text> : null}
          </View>

          {/* Optional Referral Code */}
          <View style={styles.fieldWrapper}>
            <TextInput
              label="Referral Code (Optional) 🤝"
              placeholder="e.g. REF-ABCDEF"
              value={formData.referralCode || ''}
              onChangeText={(text) => setFormData({...formData, referralCode: text.toUpperCase()})}
              mode="outlined"
              style={styles.input}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              textColor={colors.text}
              left={<TextInput.Icon icon="gift-outline" color={colors.subtext} />}
            />
          </View>

          {/* Password */}
          <View style={styles.fieldWrapper}>
            <TextInput
              label={t('password_placeholder', language)}
              value={formData.password}
              onChangeText={(text) => setFormData({...formData, password: text})}
              mode="outlined"
              secureTextEntry
              style={styles.input}
              outlineColor={errors.password ? '#EF4444' : colors.border}
              activeOutlineColor={errors.password ? '#EF4444' : colors.primary}
              textColor={colors.text}
              left={<TextInput.Icon icon="lock-outline" color={colors.subtext} />}
            />
            {errors.password ? <Text style={styles.inlineError}>{errors.password}</Text> : null}
          </View>

          {/* Submit Button */}
          <Button 
            mode="contained" 
            onPress={handleSignup} 
            loading={loading}
            style={[styles.signupButton, { backgroundColor: colors.primary }]}
            contentStyle={{ height: 55 }}
            labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
          >
            {t('signup_btn', language)}
          </Button>
        </Animatable.View>

        <TouchableOpacity style={styles.footer} onPress={() => navigation.navigate('Login')}>
           <Text style={[styles.footerText, { color: colors.subtext }]}>{t('already_account', language)}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Frosted custom staggered bubbles overlay */}
      <ProcessingOverlay 
        visible={loading} 
        message={t('creating_account', language) || "Account Creation in Progress..."} 
      />

      {/* MAP MODAL */}
      <Portal>
        <PaperModal
          visible={mapVisible}
          onDismiss={() => setMapVisible(false)}
          contentContainerStyle={[styles.mapModal, { backgroundColor: colors.background }]}
        >
          <View style={styles.mapHeader}>
            <Text style={[styles.mapTitle, { color: colors.text }]}>Confirm Location</Text>
            <IconButton icon="close" onPress={() => setMapVisible(false)} />
          </View>
          
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: formData.latitude,
              longitude: formData.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onPress={(e) => setFormData(p => ({ ...p, ...e.nativeEvent.coordinate }))}
          >
            <Marker coordinate={{ latitude: formData.latitude, longitude: formData.longitude }} />
          </MapView>

          {/* Premium Floating "Pin My Location" GPS Button */}
          <TouchableOpacity 
            style={[styles.gpsFloatingBtn, { backgroundColor: colors.card }]}
            onPress={handleGpsPin}
            activeOpacity={0.8}
          >
            {gpsLoading ? (
              <ActivityIndicator size={20} color={colors.primary} />
            ) : (
              <>
                <IconButton icon="crosshairs-gps" size={20} iconColor={colors.primary} style={{ margin: 0 }} />
                <Text style={[styles.gpsText, { color: colors.primary }]}>Pin My Location</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.mapFooter}>
            <Button 
              mode="contained" 
              onPress={() => handleConfirmLocation({ latitude: formData.latitude, longitude: formData.longitude })}
              loading={detecting}
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
            >
              Set Selected Location
            </Button>
          </View>
        </PaperModal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 50,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  subtitle: {
    fontSize: 14,
    marginLeft: 10,
    marginTop: 5,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  form: {
    borderRadius: 30,
    padding: 20,
    elevation: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  fieldWrapper: {
    marginBottom: 15,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    marginLeft: 4,
  },
  segmentedButtons: {
    marginBottom: 10,
  },
  input: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    overflow: 'hidden'
  },
  inlineError: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 4,
  },
  locationContainer: {
    marginBottom: 15,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderRadius: 12,
    paddingRight: 10,
  },
  pickText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  addressInput: {
    backgroundColor: 'rgba(241, 245, 249, 0.5)',
    borderRadius: 12,
  },
  signupButton: {
    marginTop: 15,
    borderRadius: 18,
    elevation: 4,
  },
  footer: {
    marginTop: 25,
    alignItems: 'center',
    marginBottom: 50,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  mapModal: {
    margin: 20,
    borderRadius: 30,
    height: height * 0.72,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingLeft: 20,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  map: {
    flex: 1,
  },
  gpsFloatingBtn: {
    position: 'absolute',
    bottom: 95,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 100,
    height: 44,
  },
  gpsText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  mapFooter: {
    padding: 20,
  },
  confirmBtn: {
    borderRadius: 18,
    height: 52,
    justifyContent: 'center',
  }
});

export default SignupScreen;

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'home_screen.dart';

class VerifyCodeScreen extends StatefulWidget {
  final String email;
  final String? verificationCode; // Code de vérification (en développement)

  const VerifyCodeScreen({
    super.key,
    required this.email,
    this.verificationCode,
  });

  @override
  State<VerifyCodeScreen> createState() => _VerifyCodeScreenState();
}

class _VerifyCodeScreenState extends State<VerifyCodeScreen> {
  final _formKey = GlobalKey<FormState>();
  final _codeController = TextEditingController();
  bool _isLoading = false;
  final _api = ApiService();

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _verifyCode() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final response = await _api.post('/api/auth/verify-code', data: {
        'email': widget.email,
        'code': _codeController.text.trim(),
      });

      if (response.statusCode == 200) {
        final token = response.data['token'];
        final refreshToken = response.data['refreshToken'];

        if (token == null) {
          throw Exception('Token non reçu dans la réponse');
        }

        // Stocker les tokens
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', token);
        if (refreshToken != null) {
          await prefs.setString('refresh_token', refreshToken);
        }

        print('✅ Compte activé avec succès');

        if (mounted) {
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (_) => const HomeScreen()),
            (route) => false,
          );
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Compte activé avec succès !'),
              backgroundColor: AppTheme.secondaryColor,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        String errorMessage = 'Erreur lors de la vérification du code';
        
        // Extraire le message d'erreur de la réponse
        if (e is DioException && e.response?.data is Map) {
          final errorData = e.response!.data as Map;
          if (errorData.containsKey('message')) {
            errorMessage = errorData['message'] as String;
          }
        } else {
          errorMessage = ApiService.getErrorMessage(e);
        }

        print('❌ Erreur lors de la vérification: $errorMessage');
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: AppTheme.errorColor,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _resendCode() async {
    setState(() => _isLoading = true);

    try {
      print('📧 Demande d\'un nouveau code pour: ${widget.email}');
      final response = await _api.post('/api/auth/resend-code', data: {
        'email': widget.email,
      });

      if (response.statusCode == 200 && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Un nouveau code a été envoyé sur WhatsApp. Vérifiez les logs du serveur pour le code.'),
            backgroundColor: AppTheme.secondaryColor,
            duration: Duration(seconds: 4),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        String errorMessage = 'Erreur lors de l\'envoi du code';
        
        // Extraire le message d'erreur de la réponse
        if (e is DioException && e.response?.data is Map) {
          final errorData = e.response!.data as Map;
          if (errorData.containsKey('message')) {
            errorMessage = errorData['message'] as String;
          }
        } else {
          errorMessage = ApiService.getErrorMessage(e);
        }

        print('❌ Erreur lors de la demande de nouveau code: $errorMessage');
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: AppTheme.errorColor,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Vérification'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 40),
                // Icône WhatsApp
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    color: AppTheme.secondaryColor.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.chat,
                    size: 50,
                    color: AppTheme.secondaryColor,
                  ),
                ),
                const SizedBox(height: 32),
                Text(
                  'Vérification WhatsApp',
                  style: Theme.of(context).textTheme.headlineMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                Text(
                  widget.verificationCode != null
                      ? 'Code de vérification généré (WhatsApp non configuré)'
                      : 'Nous avons envoyé un code de vérification à 6 chiffres sur votre WhatsApp.',
                  style: Theme.of(context).textTheme.bodyLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  widget.email,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: AppTheme.primaryColor,
                      ),
                  textAlign: TextAlign.center,
                ),
                if (widget.verificationCode != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.secondaryColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppTheme.secondaryColor),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.info_outline,
                          color: AppTheme.secondaryColor,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Code de développement: ${widget.verificationCode}',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: AppTheme.secondaryColor,
                                  fontWeight: FontWeight.w600,
                                ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 48),
                TextFormField(
                  controller: _codeController,
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 8,
                  ),
                  decoration: InputDecoration(
                    labelText: 'Code de vérification',
                    hintText: '123456',
                    prefixIcon: const Icon(Icons.lock),
                    counterText: '',
                  ),
                  maxLength: 6,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Veuillez entrer le code';
                    }
                    if (value.length != 6) {
                      return 'Le code doit contenir 6 chiffres';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: _isLoading ? null : _verifyCode,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : const Text('Vérifier le code'),
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: _isLoading ? null : _resendCode,
                  child: const Text('Renvoyer le code'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}


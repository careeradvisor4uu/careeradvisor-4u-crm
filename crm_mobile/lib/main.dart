import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CRM Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      home: const LoginScreen(),
    );
  }
}

// ─── LOGIN SCREEN ───────────────────────────────────────────────
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;
  String _error = '';

  Future<void> _login() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final res = await http.post(
        Uri.parse('http://localhost:5000/api/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': _emailController.text,
          'password': _passwordController.text,
        }),
      );
      if (res.statusCode == 200) {
        if (!mounted) return;
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const HomeScreen()),
        );
      } else {
        setState(() {
          _error = 'Invalid email or password';
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Cannot connect to server';
      });
    }
    setState(() {
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.blue.shade50,
      body: Center(
        child: Card(
          margin: const EdgeInsets.all(32),
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.business, size: 64, color: Colors.blue),
                const SizedBox(height: 16),
                const Text(
                  'CRM Login',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 24),
                TextField(
                  controller: _emailController,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _passwordController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Password',
                    border: OutlineInputBorder(),
                  ),
                ),
                if (_error.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(_error, style: const TextStyle(color: Colors.red)),
                ],
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _login,
                    child: _loading
                        ? const CircularProgressIndicator()
                        : const Text('Login'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ─── HOME SCREEN ────────────────────────────────────────────────
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('CRM Dashboard'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: GridView.count(
          crossAxisCount: 2,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
          children: [
            _DashboardCard(
              icon: Icons.people,
              label: 'Leads',
              color: Colors.orange,
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const LeadsScreen()),
              ),
            ),
            _DashboardCard(
              icon: Icons.phone,
              label: 'Telecallers',
              color: Colors.green,
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const TelecallersScreen()),
              ),
            ),
            _DashboardCard(
              icon: Icons.person,
              label: 'Users',
              color: Colors.purple,
              onTap: () {},
            ),
            _DashboardCard(
              icon: Icons.bar_chart,
              label: 'Reports',
              color: Colors.red,
              onTap: () {},
            ),
          ],
        ),
      ),
    );
  }
}

class _DashboardCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _DashboardCard({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 48, color: color),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── LEADS SCREEN ───────────────────────────────────────────────
class LeadsScreen extends StatefulWidget {
  const LeadsScreen({super.key});
  @override
  State<LeadsScreen> createState() => _LeadsScreenState();
}

class _LeadsScreenState extends State<LeadsScreen> {
  List _leads = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchLeads();
  }

  Future<void> _fetchLeads() async {
    try {
      final res = await http.get(Uri.parse('http://localhost:5000/api/leads'));
      if (res.statusCode == 200) {
        setState(() {
          _leads = jsonDecode(res.body);
        });
      }
    } catch (e) {
      debugPrint('Error: $e');
    }
    setState(() {
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Leads'),
        backgroundColor: Colors.orange,
        foregroundColor: Colors.white,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _leads.isEmpty
          ? const Center(child: Text('No leads found'))
          : ListView.builder(
              itemCount: _leads.length,
              itemBuilder: (_, i) => ListTile(
                leading: const CircleAvatar(child: Icon(Icons.person)),
                title: Text(_leads[i]['name'] ?? ''),
                subtitle: Text(_leads[i]['email'] ?? ''),
                trailing: Chip(label: Text(_leads[i]['status'] ?? '')),
              ),
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {},
        child: const Icon(Icons.add),
      ),
    );
  }
}

// ─── TELECALLERS SCREEN ─────────────────────────────────────────
class TelecallersScreen extends StatefulWidget {
  const TelecallersScreen({super.key});
  @override
  State<TelecallersScreen> createState() => _TelecallersScreenState();
}

class _TelecallersScreenState extends State<TelecallersScreen> {
  List _telecallers = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchTelecallers();
  }

  Future<void> _fetchTelecallers() async {
    try {
      final res = await http.get(
        Uri.parse('http://localhost:5000/api/telecallers'),
      );
      if (res.statusCode == 200) {
        setState(() {
          _telecallers = jsonDecode(res.body);
        });
      }
    } catch (e) {
      debugPrint('Error: $e');
    }
    setState(() {
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Telecallers'),
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _telecallers.isEmpty
          ? const Center(child: Text('No telecallers found'))
          : ListView.builder(
              itemCount: _telecallers.length,
              itemBuilder: (_, i) => ListTile(
                leading: CircleAvatar(
                  backgroundColor: _telecallers[i]['status'] == 'active'
                      ? Colors.green
                      : Colors.grey,
                  child: const Icon(Icons.phone, color: Colors.white),
                ),
                title: Text(_telecallers[i]['name'] ?? ''),
                subtitle: Text(_telecallers[i]['email'] ?? ''),
                trailing: Chip(label: Text(_telecallers[i]['status'] ?? '')),
              ),
            ),
    );
  }
}
